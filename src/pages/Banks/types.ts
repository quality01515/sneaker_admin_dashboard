export interface Overview {
    total_sol_held: string,
    total_usd_value: string,
    number_of_sql_tokens: string,
}

export interface BankTokenInfo {
    token_logo: string,
    token_address: string,
    number_of_tokens_hold_in_bank: string,
}

export interface Bank {
    bank_id: number,
    bank_address: string,
    sol_held: string,
    total_usd_value: string,
    n_spl_tokens: number,
    token_details: BankTokenInfo[],
}


export interface BanksResponse {
    data: Bank[],
    page: number,
    per_page: number,
    has_more: boolean,
}
