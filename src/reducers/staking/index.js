import { handleActions } from 'redux-actions'
import reduceReducers from 'reduce-reducers'

import { 
    updateStaking,
    switchAccount,
    ACCOUNT_DEFAULTS,
    
    staking
 } from '../../actions/staking'
import { selectAccount } from '../../actions/account'

// sample validator entry
// const validator = {
//     accountId: '',
//     contract: 'validatorContractInstance',
//     // in the UI
//     staked: '0', // amount you have staked RN
//     unclaimed: '0', // rewards earned for the stake you originally deposited
//     unstaked: '0',
//     available: '0', // for withdrawal
//     pending: '0', // pending unstake (4 epochs 48hr then available)
// }

const initialState = {
    allValidators: [],
    accounts: [],
    isLockup: false,
    currentAccount: { ...ACCOUNT_DEFAULTS }
}

const stakingHandlers = handleActions({
    [updateStaking]: (state, { payload }) => {
        if (payload && payload.replaceState) {
            delete payload.replaceState
            return {
                ...payload,
            }
        }
        return {
            ...state,
            ...payload,
        }
    },
    [switchAccount]: (state, { payload }) => {
        return {
            ...state,
            ...payload,
        }
    },
    [selectAccount]: () => {
        return initialState
    },
    [staking.getAccounts]: (state, { ready, error, payload }) => {

        return {
            ...state,
            accounts: Object.values(payload).map((accountId) => ({
                accountId 
            }))
        }
    },
    [staking.updateAccount]: (state, { ready, error, payload }) => {
        if (!ready || error) {
            return state
        }

        return {
            ...state,
            accounts: state.accounts.map((account) => account.accountId === payload.accountId
                ? ({
                    ...account,
                    ...payload
                }) : account
            )
        }
    },
    [staking.updateLockup]: (state, { ready, error, payload }) => {
        if (!ready || error) {
            return state
        }

        return {
            ...state,
            accounts: state.accounts.map((account) => account.accountId === payload.accountId
                ? ({
                    ...account,
                    ...payload
                }) : account
            )
        }
    },


    [staking.updateCurrent]: (state, { payload }) => {
        return {
            ...state,
            currentAccount: state.accounts.find((account) => account.accountId === payload)
        }
    }
}, initialState)

export default reduceReducers(
    initialState,
    stakingHandlers,
)
