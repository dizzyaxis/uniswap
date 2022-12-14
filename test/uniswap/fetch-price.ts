import { ethers } from 'hardhat'
import { Pool } from '@uniswap/v3-sdk'
import { Token } from '@uniswap/sdk-core'
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import { expect } from 'chai'

interface Immutables {
  factory: string
  token0: string
  token1: string
  fee: number
  tickSpacing: number
  maxLiquidityPerTick: ethers.BigNumber
}

interface State {
  liquidity: ethers.BigNumber
  sqrtPriceX96: ethers.BigNumber
  tick: number
  observationIndex: number
  observationCardinality: number
  observationCardinalityNext: number
  feeProtocol: number
  unlocked: boolean
}

describe('Fetching Pool Contract', function () {
  it('Should create a pool', async function () {
    const { pool, immutables, state } = await createPool()
    console.log('USDC/ETH: ', pool.token0Price.toSignificant(6))
    console.log('ETH/USDC: ', pool.token1Price.toSignificant(6))
    expect(pool).to.not.be.null
  })
})

async function getPoolContract() {
  const signer = await ethers.getImpersonatedSigner(
    '0x10bf1Dcb5ab7860baB1C3320163C6dddf8DCC0e4',
  )

  const poolAddress = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8'

  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    ethers.provider,
  )

  return poolContract
}

async function getPoolImmutables() {
  const poolContract = await getPoolContract()

  const [
    factory,
    token0,
    token1,
    fee,
    tickSpacing,
    maxLiquidityPerTick,
  ] = await Promise.all([
    poolContract.factory(),
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
    poolContract.tickSpacing(),
    poolContract.maxLiquidityPerTick(),
  ])

  const immutables: Immutables = {
    factory,
    token0,
    token1,
    fee,
    tickSpacing,
    maxLiquidityPerTick,
  }
  return immutables
}

async function getPoolState() {
  const poolContract = await getPoolContract()

  const [liquidity, slot] = await Promise.all([
    poolContract.liquidity(),
    poolContract.slot0(),
  ])

  const PoolState: State = {
    liquidity,
    sqrtPriceX96: slot[0],
    tick: slot[1],
    observationIndex: slot[2],
    observationCardinality: slot[3],
    observationCardinalityNext: slot[4],
    feeProtocol: slot[5],
    unlocked: slot[6],
  }

  return PoolState
}

async function createPool() {
  const [immutables, state] = await Promise.all([
    getPoolImmutables(),
    getPoolState(),
  ])

  const TokenA = new Token(3, immutables.token0, 6, 'USDC', 'USD Coin')

  const TokenB = new Token(3, immutables.token1, 18, 'WETH', 'Wrapped Ether')

  const pool = new Pool(
    TokenA,
    TokenB,
    immutables.fee,
    state.sqrtPriceX96.toString(),
    state.liquidity.toString(),
    state.tick,
  )

  return { pool, immutables, state }
}
