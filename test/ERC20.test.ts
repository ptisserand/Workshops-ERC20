import { assert, expect } from 'chai'
import { starknet } from 'hardhat'

import { Account, StarknetContract, StarknetContractFactory } from 'hardhat/types/runtime'
import { TIMEOUT } from './constants'

describe('Test ERC20', function () {
    this.timeout(TIMEOUT)

    let ERC20Factory: StarknetContractFactory
    let ERC20: StarknetContract
    let owner: Account
    let user: Account

    before(async function () {
        // assumes contract.cairo and events.cairo has been compiled
        owner = await starknet.deployAccount('OpenZeppelin')
        user = await starknet.deployAccount('OpenZeppelin')

        ERC20Factory = await starknet.getContractFactory('ERC20/ERC20')
        ERC20 = await ERC20Factory.deploy({
            name: starknet.shortStringToBigInt('LINK Token'),
            symbol: starknet.shortStringToBigInt('LINK'),
            decimals: 18,
            initial_supply: { high: 0n, low: 1000n },
            recipient: BigInt(owner.starknetContract.address),
        })
    })

    it('should read totalSupply successfully', async () => {
        const { totalSupply: totalSupply } = await user.call(ERC20, "totalSupply")
        console.log("TotalSupply: ", totalSupply)
        expect(totalSupply).to.deep.equal({ low: 1000n, high: 0n })
    })

    it('should read decimals successfully', async () => {
        const { decimals: decimals } = await user.call(ERC20, "decimals")
        console.log("Decimals: ", decimals)
        assert.equal(decimals, 18)
    })

    it('should transfer successfully', async () => {
        await owner.invoke(ERC20, "transfer", { recipient: user.address, amount: { high: 0n, low: 10n } })

        const { balance: balance } = await user.call(ERC20, "balanceOf", { account: user.address })
        console.log("Balance User: ", balance)
        expect(balance).to.deep.equal({ high: 0n, low: 10n })
        // assert.equal(balance, {high: 0n, low: 10n})

        const { balance: balanceOwner } = await owner.call(ERC20, "balanceOf", { account: owner.address })
        console.log("Balance Owner: ", balanceOwner)
        expect(balanceOwner).to.deep.equal({ high: 0n, low: 990n })
    })

    it('should transferFrom successfully', async () => {
        try {
            await owner.invoke(ERC20, "transferFrom", { sender: user.address, recipient: owner.address, amount: { high: 0n, low: 3n } })
            expect.fail("Should throw an error")
        } catch (error: any) {
            expect(error.message).to.contain("ERC20: insufficient allowance")
        }

        await user.invoke(ERC20, "approve", { spender: owner.address, amount: { high: 0, low: 3n } })
        let { balance: user_balance } = await user.call(ERC20, "balanceOf", { account: user.address })
        await owner.invoke(ERC20, "transferFrom", { sender: user.address, recipient: owner.address, amount: { high: 0n, low: 3n } })
        let { balance: new_user_balance } = await user.call(ERC20, "balanceOf", { account: user.address })
        expect(user_balance).to.not.deep.equal(new_user_balance);
    })

    it('should decreaseAllowance successfully', async () => {
        await user.invoke(ERC20, "approve", { spender: owner.address, amount: { high: 0n, low: 1000n } })
        let { remaining } = await user.call(ERC20, "allowance", { owner: user.address, spender: owner.address })
        expect(remaining).to.deep.equal({ high: 0n, low: 1000n })
        await user.invoke(ERC20, "decreaseAllowance", { spender: owner.address, removed_value: { high: 0n, low: 500n } })
        let { remaining: new_remaining } = await user.call(ERC20, "allowance", { owner: user.address, spender: owner.address })
        expect(new_remaining).to.deep.equal({ high: 0n, low: 500n })
    })

    it('should call setDecimals successfully', async () => {
        try {
            await user.invoke(ERC20, "setDecimals", { decimals: 12 })
            expect.fail("User calling setDecimals should throw an error")
        } catch (error: any) {
            expect(error.message).to.contain("ERC20: only owner can set decimals")
        }
        await owner.invoke(ERC20, "setDecimals", { decimals: 12 })
        const { decimals: decimals } = await user.call(ERC20, "decimals")
        console.log(decimals)
        assert.equal(decimals, 12)
    })

})