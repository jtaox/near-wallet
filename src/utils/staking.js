import * as nearApiJs from 'near-api-js'
import BN from 'bn.js'
import { WalletError } from './walletError'
import { getLockupAccountId } from './account-with-lockup'
import { ACCOUNT_HELPER_URL } from './wallet'
import { store } from '..'

const {
    transactions: {
        functionCall
    },
    utils: {
        format: {
            parseNearAmount
        }
    },
    Account,
    Contract
} = nearApiJs

export const ACCOUNT_DEFAULTS = {
    selectedValidator: '',
    totalPending: '0', // pending withdrawal
    totalAvailable: '0', // available for withdrawal
    totalUnstaked: '0', // available to be staked
    totalStaked: '0', 
    totalUnclaimed: '0', // total rewards paid out - staking deposits made
    validators: [],
}
export const STAKING_AMOUNT_DEVIATION = parseNearAmount('0.00001')

const STAKE_VALIDATOR_PREFIX = '__SVPRE__'
export const ZERO = new BN('0')
export const MIN_DISPLAY_YOCTO = new BN('100');
const EXPLORER_DELAY = 2000
export const MIN_LOCKUP_AMOUNT = new BN(process.env.MIN_LOCKUP_AMOUNT || parseNearAmount('35.00001'))
const STAKING_GAS_BASE = process.env.REACT_APP_STAKING_GAS_BASE || '25000000000000' // 25 Tgas

const stakingMethods = {
    viewMethods: [
        'get_account_staked_balance',
        'get_account_unstaked_balance',
        'get_account_total_balance',
        'is_account_unstaked_balance_available',
        'get_total_staked_balance',
        'get_owner_id',
        'get_reward_fee_fraction',
    ],
    changeMethods: [
        'ping',
        'deposit',
        'deposit_and_stake',
        'deposit_to_staking_pool',
        'stake',
        'stake_all',
        'unstake',
        'withdraw',
    ],
}

export const lockupMethods = {
    viewMethods: [
        'get_balance',
        'get_locked_amount',
        'get_owners_balance',
        'get_staking_pool_account_id',
        'get_known_deposited_balance',
    ]
}

// caching value in module, no need to fetch frequently
let ghValidators

export class Staking {
    constructor(wallet) {
        this.wallet = wallet
        this.provider = wallet.connection.provider
    }

    async getAccounts() {
        return { 
            accountId: this.wallet.accountId, 
            lockupId : await this.checkLockupExists(this.wallet.accountId)
        }
    }

    async checkLockupExists(accountId) {
        let lockupId
        try {
            const { lockupId: _lockupId } = await this.getLockup(accountId)
            lockupId = _lockupId
        } catch(e) {
            if (!/No contract for account/.test(e.message)) {
                throw e
            }
        }
        return lockupId
    }


    /********************************
    Staking API for redux actions
    ********************************/

    

    async withdraw(currentAccountId, validatorId, amount) {
        const { accountId } = await this.getAccounts()
        const isLockup = currentAccountId !== accountId
        if (amount && amount.length < 15) {
            amount = parseNearAmount(amount)
        }
        if (isLockup) {
            const { lockupId } = await this.getLockup()
            return this.lockupWithdraw(lockupId, amount)
        }
        return this.accountWithdraw(validatorId, amount)
    }

    /********************************
    Lockup
    ********************************/

    async lockupWithdraw(lockupId, amount) {
        let result
        if (amount) {
            result = await this.signAndSendTransaction(lockupId, [
                functionCall('withdraw_from_staking_pool', { amount }, STAKING_GAS_BASE * 5, '0')
            ])
        } else {
            result = await this.signAndSendTransaction(lockupId, [
                functionCall('withdraw_all_from_staking_pool', {}, STAKING_GAS_BASE * 7, '0')
            ])
        }
        if (result === false) {
            throw new WalletError('Unable to withdraw pending balance from validator', 'staking.noWithdraw')
        }
        return result
    }

    async lockupSelect(validatorId, lockupId, unselect = false) {
        if (unselect) {
            await this.signAndSendTransaction(lockupId, [
                functionCall('unselect_staking_pool', {}, STAKING_GAS_BASE, '0')
            ])
        }
        await this.signAndSendTransaction(lockupId, [
            functionCall('select_staking_pool', { staking_pool_account_id: validatorId }, STAKING_GAS_BASE * 3, '0')
        ])
    }

    async getLockup(accountId = this.wallet.accountId) {
        let lockupId
        if (process.env.REACT_APP_USE_TESTINGLOCKUP && accountId.length < 64) {
            lockupId = `testinglockup.${accountId}`
        } else {
            lockupId = getLockupAccountId(accountId)
        }
        const contract = await this.getContractInstance(lockupId, lockupMethods, accountId)
        return { contract, lockupId, accountId }
    }

    /********************************
    Account
    ********************************/

    async accountWithdraw(validatorId, amount) {
        let result
        if (amount) {
            result = await this.signAndSendTransaction(validatorId, [
                functionCall('withdraw', { amount }, STAKING_GAS_BASE * 5, '0')
            ])
        } else {
            result = await this.signAndSendTransaction(validatorId, [
                functionCall('withdraw_all', {}, STAKING_GAS_BASE * 7, '0')
            ])
        }
        if (result === false) {
            throw new WalletError('Unable to withdraw pending balance from validator', 'staking.noWithdraw')
        }
        // wait for explorer to index results
        await new Promise((r) => setTimeout(r, EXPLORER_DELAY))
        return result
    }

    async accountUnstake(validatorId, amount) {
        let result
        if (amount) {
            result = await this.signAndSendTransaction(validatorId, [
                functionCall('unstake', { amount }, STAKING_GAS_BASE * 5, '0')
            ])
        } else {
            result = await this.signAndSendTransaction(validatorId, [
                functionCall('unstake_all', {}, STAKING_GAS_BASE * 5, '0')
            ])
        }
        // wait for explorer to index results
        await new Promise((r) => setTimeout(r, EXPLORER_DELAY))
        await this.updateStakedBalance(validatorId)
        return result
    }

    async updateStakedBalance(validatorId) {
        const { accountId: account_id } = await this.getAccounts()
        const contract = await this.getContractInstance(validatorId, stakingMethods)
        const lastStakedBalance = await contract.get_account_staked_balance({ account_id })
        localStorage.setItem(STAKE_VALIDATOR_PREFIX + validatorId + account_id, lastStakedBalance)
    }

    /********************************
    Helpers
    ********************************/

    async getContractInstance(contractId, methods, accountId = this.wallet.accountId) {
        try {
            await (await new Account(this.wallet.connection, contractId)).state()
            return await new Contract(await this.wallet.getAccount(accountId), contractId, { ...methods })
        } catch (e) {
            throw new WalletError('No contract for account', 'staking.noLockup')
        }
    }

    async signAndSendTransaction(receiverId, actions) {
        return (await this.wallet.getAccount(this.wallet.accountId)).signAndSendTransaction(receiverId, actions)
    }
}

export async function getStakingDeposits(accountId) {
    let stakingDeposits = await fetch(ACCOUNT_HELPER_URL + '/staking-deposits/' + accountId).then((r) => r.json()) 

    const validatorDepositMap = {}
    stakingDeposits.forEach(({ validator_id, deposit }) => {
        validatorDepositMap[validator_id] = deposit
    })
    
    return validatorDepositMap
}
