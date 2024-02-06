import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Token22Staking } from "../target/types/token22_staking";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, mintTo, createMint, setAuthority, AuthorityType, getAssociatedTokenAddress, createAssociatedTokenAccount, getAccount, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { delay, safeAirdrop, MULT } from './utils/utils'
import { assert } from "chai"
import { BN } from "bn.js"

describe("token22-staking", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Token22Staking as Program<Token22Staking>;
  const provider = anchor.AnchorProvider.env()

  const payer = anchor.web3.Keypair.generate()

  let stakingTokenMint: PublicKey = null
  let stakeVault: PublicKey = null
  let pool: PublicKey = null
  let testTokenMint: PublicKey = null
  let user1StakeEntry: PublicKey = null
  let user1Ata: PublicKey = null
  let user2StakeEntry: PublicKey = null
  let user3StakeEntry: PublicKey = null


  // derive program authority PDA
  let [vaultAuthority, vaultAuthBump] = await PublicKey.findProgramAddress(
    [Buffer.from("vault_authority")],
    program.programId
  )


  it("Create Staking Token Mint", async () => {
    await safeAirdrop(vaultAuthority, provider.connection)
    await safeAirdrop(provider.wallet.publicKey, provider.connection)
    await safeAirdrop(payer.publicKey, provider.connection)
    delay(10000)

    // create staking token mint    
    stakingTokenMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      undefined,
      6,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    )
    
    console.log("Staking token mint: ", stakingTokenMint.toBase58())

    // assign staking token mint to a PDA of the staking program
    let setAuthTx = await setAuthority(
      provider.connection,
      payer,
      stakingTokenMint,
      payer,
      AuthorityType.MintTokens,
      vaultAuthority,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    )
    
    console.log("Authority assignment tx: ", setAuthTx)
  })

  it("Create test token to stake", async () => {
    // create new token mint    
    testTokenMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      undefined,
      6,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    )

    console.log("Test token mint: ", testTokenMint.toBase58())

    // create associated token account of test user
    user1Ata = await createAssociatedTokenAccount (
      provider.connection,
      payer,
      testTokenMint,
      payer.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    )

    console.log("Test user associated tokena account: ", user1Ata.toBase58())

    // mint 1000 tokens to test user
    let mintTx = await mintTo(
      provider.connection,
      payer,
      testTokenMint,
      user1Ata,
      payer,
      1000,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    )
    
    console.log("Mint tx: ", mintTx)
  })

  it("Create test stake pool!", async () => {
    const [poolState, poolBump] = await PublicKey.findProgramAddress(
      [testTokenMint.toBuffer(), Buffer.from("state")],
      program.programId
    )
    pool = poolState

    const [vault, vaultBump] = await PublicKey.findProgramAddress(
      [testTokenMint.toBuffer(), vaultAuthority.toBuffer(), Buffer.from("vault")],
      program.programId
    )
    stakeVault = vault

    // call init_pool ix on program
    await program.methods.initPool()
    .accounts({
      poolAuthority: vaultAuthority,
      poolState: pool,
      tokenMint: testTokenMint,
      tokenVault: stakeVault,
      stakingTokenMint: stakingTokenMint,
      payer: payer.publicKey,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY
    })
    .signers([payer])
    .rpc()

    const poolAcct = await program.account.poolState.fetch(pool)
    assert(poolAcct.vaultAuthority.toBase58() == vaultAuthority.toBase58())
    assert(poolAcct.amount.toNumber() == 0)
    assert(poolAcct.stakingTokenMint.toBase58() == stakingTokenMint.toBase58())
    assert(poolAcct.tokenMint.toBase58() == testTokenMint.toBase58())
    assert(poolAcct.vaultAuthBump == vaultAuthBump)
    assert(poolAcct.vaultBump == vaultBump)
  })

  it("Create stake entry for user", async () => {
    const poolStateAcct = await program.account.poolState.fetch(pool)
    
    const [stakeEntry, stakeentryBump] = await PublicKey.findProgramAddress(
      [payer.publicKey.toBuffer(), poolStateAcct.tokenMint.toBuffer(), Buffer.from("stake_entry")],
      program.programId
    )
    user1StakeEntry = stakeEntry

    await program.methods.initStakeEntry()
    .accounts({
      user: payer.publicKey,
      userStakeEntry: user1StakeEntry,
      poolState: pool,
      systemProgram: SystemProgram.programId
    })
    .signers([payer])
    .rpc()

    const stakeAcct = await program.account.stakeEntry.fetch(user1StakeEntry)
    assert(stakeAcct.user.toBase58() == payer.publicKey.toBase58())
    assert(stakeAcct.balance == 0)
    assert(stakeAcct.bump == stakeentryBump)
  })

  it("Stake tokens!", async () => {
    // fetch stake acct before transfer
    let stakeAcct = await program.account.stakeEntry.fetch(user1StakeEntry)
    console.log("User 1 amount staked before transfer: ", stakeAcct.balance.toNumber())

    // fetch pool state acct 
    let poolAcct = await program.account.poolState.fetch(pool)
    console.log("Total amount staked in pool: ", poolAcct.amount.toNumber())

    await program.methods.stake(new BN(1))
    .accounts({
      poolState: pool,
      tokenMint: testTokenMint,
      poolAuthority: vaultAuthority,
      tokenVault: stakeVault,
      user: payer.publicKey,
      userTokenAccount: user1Ata,
      userStakeEntry: user1StakeEntry,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([payer])
    .rpc()

    stakeAcct = await program.account.stakeEntry.fetch(user1StakeEntry)
    console.log("User 1 amount staked after transfer: ", stakeAcct.balance.toNumber())

    poolAcct = await program.account.poolState.fetch(pool)
    console.log("Total amount staked in pool after transfer: ", poolAcct.amount.toNumber())
  })
});
