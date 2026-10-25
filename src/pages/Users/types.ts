export interface Overview {
    total_users: number,
    new_users_24h: number,
    new_users_7d: number,
    new_users_30d: number,
    active_users_24h: number,
    active_users_7d: number,
    active_users_30d: number,
    falloff_users_7d: number,
    falloff_users_30d: number,
}

export interface PortfolioHolders {
    ready: boolean,
    total_users: number | null,
    computed_at: string | null,
}

export interface User {
    user_address: string,
    current_invites: number,
    referrer_address: string,
    referral_base_cut: number,
    created_at: string,
    kol_multiplier: number,
}


export interface UserResponse {
    data: User[],
    page: number,
    per_page: number,
    has_more: boolean,
}
