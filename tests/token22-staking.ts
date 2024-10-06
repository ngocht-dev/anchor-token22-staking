import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Token22Staking } from "../target/types/token22_staking";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  mintTo,
  createMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  getAccount,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { delay, safeAirdrop } from "./utils/utils";
import { assert } from "chai";
import { BN } from "bn.js";

describe("token22-staking", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Token22Staking as Program<Token22Staking>;
  const provider = anchor.AnchorProvider.env();

  // test accounts
  const payer = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array([
      23, 136, 220, 91, 76, 19, 95, 195, 23, 214, 165, 252, 230, 111, 177, 175,
      5, 180, 149, 74, 47, 105, 144, 172, 19, 108, 85, 133, 142, 47, 240, 96,
      190, 248, 146, 244, 3, 15, 242, 244, 51, 16, 5, 45, 36, 150, 42, 28, 119,
      249, 123, 62, 225, 106, 42, 176, 94, 17, 75, 63, 102, 236, 222, 65,
    ])
  );

  let stakingTokenMint: PublicKey = new PublicKey(
    "BCXJuKm2GHyD65mUYXoFsiG6LYxKefFfJY2nMZvQrWzE"
  );
  let testTokenMint: PublicKey = new PublicKey(
    "9LojbLaTdoM5qFcsWmi4CEfHWNwvQ81rUNryKBZAZqqH"
  );

  // derive program authority PDA
  let [vaultAuthority, vaultAuthBump] = await PublicKey.findProgramAddress(
    [Buffer.from("vault_authority")],
    program.programId
  );

  // it("[Token22] Create Staking Token Mint with Token22 Program", async () => {
  //   // create staking token mint, pass in TOKEN_2022_PROGRAM_ID
  //   stakingTokenMint = await createMint(
  //     provider.connection,
  //     payer,
  //     vaultAuthority,
  //     undefined,
  //     6,
  //     undefined,
  //     undefined,
  //     TOKEN_2022_PROGRAM_ID
  //   );
  //   console.log("Staking token mint: ", stakingTokenMint.toBase58());
  // });

  // it("[Token22] Create test Token22 token to stake", async () => {
  //   // create new token mint
  //   testTokenMint = await createMint(
  //     provider.connection,
  //     payer,
  //     payer.publicKey,
  //     undefined,
  //     6,
  //     undefined,
  //     undefined,
  //     TOKEN_2022_PROGRAM_ID
  //   );
  //   console.log("Test token mint: ", testTokenMint.toBase58())

  //   // create test token ata of test user
  //   // user1StakeAta = await getAssociatedTokenAddress(
  //   //   stakingTokenMint,
  //   //   payer.publicKey,
  //   //   false,
  //   //   TOKEN_2022_PROGRAM_ID
  //   // );

  //   const user1Ata = await createAssociatedTokenAccount(
  //     provider.connection,
  //     payer,
  //     testTokenMint,
  //     payer.publicKey,
  //     undefined,
  //     TOKEN_2022_PROGRAM_ID
  //   );
  //   console.log("Test user associated tokena account: ", user1Ata.toBase58());

  //   // mint 1000 tokens to test user
  //   const mintTx = await mintTo(
  //     provider.connection,
  //     payer,
  //     testTokenMint,
  //     user1Ata,
  //     payer,
  //     1000,
  //     undefined,
  //     undefined,
  //     TOKEN_2022_PROGRAM_ID
  //   );
  //   console.log("Mint tx: ", mintTx);
  // });

  // it("[Token22] Create test stake pool with Token22 tokens!", async () => {
  //   const [pool] = await PublicKey.findProgramAddress(
  //     [testTokenMint.toBuffer(), Buffer.from("state")],
  //     program.programId
  //   );

  //   const [vault, vaultBump] = await PublicKey.findProgramAddress(
  //     [
  //       testTokenMint.toBuffer(),
  //       vaultAuthority.toBuffer(),
  //       Buffer.from("vault"),
  //     ],
  //     program.programId
  //   );

  //   // call init_pool ix on program
  //   await program.methods
  //     .initPool()
  //     .accounts({
  //       poolAuthority: vaultAuthority,
  //       poolState: pool,
  //       tokenMint: testTokenMint,
  //       tokenVault: vault,
  //       stakingTokenMint: stakingTokenMint,
  //       payer: payer.publicKey,
  //       tokenProgram: TOKEN_2022_PROGRAM_ID,
  //       systemProgram: SystemProgram.programId,
  //       rent: SYSVAR_RENT_PUBKEY,
  //     })
  //     .signers([payer])
  //     .rpc();

  //   const poolAcct = await program.account.poolState.fetch(pool);

  //   assert(poolAcct.vaultAuthority.toBase58() == vaultAuthority.toBase58());
  //   assert(poolAcct.amount.toNumber() == 0);
  //   assert(poolAcct.stakingTokenMint.toBase58() == stakingTokenMint.toBase58());
  //   assert(poolAcct.tokenMint.toBase58() == testTokenMint.toBase58());
  //   assert(poolAcct.vaultAuthBump == vaultAuthBump);
  //   assert(poolAcct.vaultBump == vaultBump);
  // });

  // it("[Token22] Create stake entry for user", async () => {
  //   const [pool] = await PublicKey.findProgramAddress(
  //     [testTokenMint.toBuffer(), Buffer.from("state")],
  //     program.programId
  //   );

  //   const poolStateAcct = await program.account.poolState.fetch(pool);

  //   const [stakeEntry, stakeEntryBump] = await PublicKey.findProgramAddress(
  //     [
  //       payer.publicKey.toBuffer(),
  //       poolStateAcct.tokenMint.toBuffer(),
  //       Buffer.from("stake_entry"),
  //     ],
  //     program.programId
  //   );
  //   const user1StakeAta = await getAssociatedTokenAddress(
  //     stakingTokenMint,
  //     payer.publicKey,
  //     false,
  //     TOKEN_2022_PROGRAM_ID
  //   );

  //   await program.methods
  //     .initStakeEntry()
  //     .accounts({
  //       user: payer.publicKey,
  //       userStakeEntry: stakeEntry,
  //       userStakeTokenAccount: user1StakeAta,
  //       stakingTokenMint: stakingTokenMint,
  //       poolState: pool,
  //       tokenProgram: TOKEN_2022_PROGRAM_ID,
  //       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([payer])
  //     .rpc();

  //   const stakeAcct = await program.account.stakeEntry.fetch(stakeEntry);
  //   console.log("stake account: ", stakeAcct);

  //   assert(stakeAcct.user.toBase58() == payer.publicKey.toBase58());
  //   assert(stakeAcct.balance.eq(new BN(0)));
  //   assert(stakeAcct.bump == stakeEntryBump);
  // });

  // it("[Token22] Stake tokens!", async () => {
  //   const transferAmount = 1;

  //   const [pool] = await PublicKey.findProgramAddress(
  //     [testTokenMint.toBuffer(), Buffer.from("state")],
  //     program.programId
  //   );

  //   const poolStateAcct = await program.account.poolState.fetch(pool);

  //   // fetch stake account before transfer
  //   const [stakeEntry, stakeEntryBump] = await PublicKey.findProgramAddress(
  //     [
  //       payer.publicKey.toBuffer(),
  //       poolStateAcct.tokenMint.toBuffer(),
  //       Buffer.from("stake_entry"),
  //     ],
  //     program.programId
  //   );

  //   let userEntryAcct = await program.account.stakeEntry.fetch(stakeEntry);
  //   let initialEntryBalance = userEntryAcct.balance;
  //   console.log("userEntryAcct: ", userEntryAcct);

  //   // fetch user token account before transfer
  //   const user1Ata = await getAssociatedTokenAddress(
  //     testTokenMint,
  //     payer.publicKey,
  //     false,
  //     TOKEN_2022_PROGRAM_ID
  //   );

  //   console.log("user1Ata: ", user1Ata);

  //   let userTokenAcct = await getAccount(
  //     provider.connection,
  //     user1Ata,
  //     undefined,
  //     TOKEN_2022_PROGRAM_ID
  //   );
  //   let initialUserBalance = userTokenAcct.amount;
  //   console.log(
  //     "User 1 amount staked before transfer: ",
  //     userEntryAcct.balance.toNumber()
  //   );
  //   console.log(
  //     "User 1 token account balance before transfer: ",
  //     initialUserBalance.toString()
  //   );

  //   // fetch pool state acct
  //   let poolAcct = await program.account.poolState.fetch(pool);
  //   let initialPoolAmt = poolAcct.amount;

  //   // fetch stake vault token account
  //   const [vault, vaultBump] = await PublicKey.findProgramAddress(
  //     [
  //       testTokenMint.toBuffer(),
  //       vaultAuthority.toBuffer(),
  //       Buffer.from("vault"),
  //     ],
  //     program.programId
  //   );
  //   let stakeVaultAcct = await getAccount(
  //     provider.connection,
  //     vault,
  //     undefined,
  //     TOKEN_2022_PROGRAM_ID
  //   );
  //   let initialVaultBalance = stakeVaultAcct.amount;

  //   // console.log("Total amount staked in pool: ", poolAcct.amount.toNumber())
  //   // console.log("Vault token account balance before transfer: ", initialVaultBalance.toString())

  //   await program.methods
  //     .stake(new BN(transferAmount))
  //     .accounts({
  //       poolState: pool,
  //       tokenMint: testTokenMint,
  //       poolAuthority: vaultAuthority,
  //       tokenVault: vault,
  //       user: payer.publicKey,
  //       userTokenAccount: user1Ata,
  //       userStakeEntry: stakeEntry,
  //       tokenProgram: TOKEN_2022_PROGRAM_ID,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([payer])
  //     .rpc();

  //   // verify token account balances
  //   userTokenAcct = await getAccount(
  //     provider.connection,
  //     user1Ata,
  //     undefined,
  //     TOKEN_2022_PROGRAM_ID
  //   );
  //   stakeVaultAcct = await getAccount(
  //     provider.connection,
  //     vault,
  //     undefined,
  //     TOKEN_2022_PROGRAM_ID
  //   );

  //   console.log("userTokenAcct: ", userTokenAcct);
  //   console.log("stakeVaultAcct: ", stakeVaultAcct);

  //   assert(userTokenAcct.amount == initialUserBalance - BigInt(transferAmount));
  //   assert(
  //     stakeVaultAcct.amount == initialVaultBalance + BigInt(transferAmount)
  //   );

  //   // verify state account balances
  //   let updatedUserEntryAcct = await program.account.stakeEntry.fetch(
  //     stakeEntry
  //   );
  //   let updatedPoolStateAcct = await program.account.poolState.fetch(pool);
  //   console.log("updatedUserEntryAcct: ", updatedUserEntryAcct);
  //   console.log("updatedPoolStateAcct: ", updatedPoolStateAcct);

  //   assert(
  //     updatedUserEntryAcct.balance.toNumber() ==
  //       initialEntryBalance.toNumber() + transferAmount
  //   );
  //   assert(
  //     updatedPoolStateAcct.amount.toNumber() ==
  //       initialPoolAmt.toNumber() + transferAmount
  //   );
  //   assert(
  //     updatedPoolStateAcct.amount.toNumber() ==
  //       updatedUserEntryAcct.balance.toNumber()
  //   );
  //   console.log(
  //     "User 1 amount staked after transfer: ",
  //     updatedUserEntryAcct.balance.toNumber()
  //   );
  //   console.log(
  //     "Total amount staked in pool after transfer: ",
  //     updatedPoolStateAcct.amount.toNumber()
  //   );
  // });
  it("[Token22] Unstake!", async () => {
    const [pool] = await PublicKey.findProgramAddress(
      [testTokenMint.toBuffer(), Buffer.from("state")],
      program.programId
    );

    let poolStateAcct = await program.account.poolState.fetch(pool);

    const [stakeEntry, stakeEntryBump] = await PublicKey.findProgramAddress(
      [
        payer.publicKey.toBuffer(),
        poolStateAcct.tokenMint.toBuffer(),
        Buffer.from("stake_entry"),
      ],
      program.programId
    );

    // fetch stake account before unstake
    let userEntryAcct = await program.account.stakeEntry.fetch(stakeEntry);
    let initialEntryBalance = userEntryAcct.balance;

    // fetch user token account before transfer
    const user1Ata = await getAssociatedTokenAddress(
      testTokenMint,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    let userTokenAcct = await getAccount(
      provider.connection,
      user1Ata,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    let initialUserTokenAcctBalance = userTokenAcct.amount;

    // fetch pool state acct
    let initialPoolAmt = poolStateAcct.amount;

    // fetch stake vault token account
    const [vault, vaultBump] = await PublicKey.findProgramAddress(
      [
        testTokenMint.toBuffer(),
        vaultAuthority.toBuffer(),
        Buffer.from("vault"),
      ],
      program.programId
    );
    let stakeVaultAcct = await getAccount(
      provider.connection,
      vault,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    let initialVaultBalance = stakeVaultAcct.amount;

    const user1StakeAta = await getAssociatedTokenAddress(
      stakingTokenMint,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    await program.methods
      .unstake()
      .accounts({
        poolState: pool,
        tokenMint: testTokenMint,
        poolAuthority: vaultAuthority,
        tokenVault: vault,
        user: payer.publicKey,
        userTokenAccount: user1Ata,
        userStakeEntry: stakeEntry,
        stakingTokenMint: stakingTokenMint,
        userStakeTokenAccount: user1StakeAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    // verify token account balances
    userTokenAcct = await getAccount(
      provider.connection,
      user1Ata,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    stakeVaultAcct = await getAccount(
      provider.connection,
      vault,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    let userStakeTokenAcct = await getAccount(
      provider.connection,
      user1StakeAta,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    console.log(
      "User staking token balance: ",
      userStakeTokenAcct.amount.toString()
    );


    console.log('userStakeTokenAcct: ', userStakeTokenAcct)
    console.log('userTokenAcct: ', userTokenAcct)
    console.log('stakeVaultAcct: ', stakeVaultAcct)

    assert(userStakeTokenAcct.amount > BigInt(0));
    assert(
      userTokenAcct.amount ==
        initialUserTokenAcctBalance + BigInt(initialEntryBalance.toNumber())
    );
    assert(
      stakeVaultAcct.amount ==
        initialVaultBalance - BigInt(initialEntryBalance.toNumber())
    );

    // verify state accounts
    userEntryAcct = await program.account.stakeEntry.fetch(stakeEntry);
    poolStateAcct = await program.account.poolState.fetch(pool);
    assert(
      poolStateAcct.amount.toNumber() ==
        initialPoolAmt.toNumber() - initialEntryBalance.toNumber()
    );
    assert(userEntryAcct.balance.eq(new BN(0)));
  });
});
