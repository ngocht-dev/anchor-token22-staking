use {
    anchor_lang::prelude::*,
    crate::{state::*, utils::*},
    anchor_spl::{token_interface},
    std::mem::size_of
};

pub fn handler(ctx: Context<InitializePool>) -> Result <()> {
    check_token_program(ctx.accounts.token_program.key());
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    pub token_program: Interface<'info, token_interface::TokenInterface>,
}