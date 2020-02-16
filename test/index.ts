import * as chai from 'chai'
import { describe, it } from 'mocha'
import Promise from '../src/promise'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'

const assert = chai.assert
chai.use(sinonChai)

describe('Promise', () => {
  it('是一个类', () => {
    assert.isFunction(Promise)
    assert.isObject(Promise.prototype)
  })

  it('new Promise() 如果接受的不是函数就报错', () => {
    assert.throw(() => {
      // @ts-ignore
      new Promise()
    })
    assert.throw(() => {
      // @ts-ignore
      new Promise(1)
    })
    assert.throw(() => {
      // @ts-ignore
      new Promise(true)
    })
  })
  it('new Promise(fn) 会生成一个对象，该对象会有个 then 方法', () => {
    const promise = new Promise(()=>{})
    assert.isFunction(promise.then)
  })
  it('new Promise(fn) 中的函数立即执行', () => {
    const fn = sinon.fake()
    new Promise(fn)
    assert(fn.called)
  })
  it('new Promise(fn) 中的 fn 执行的时候接受 resolve 和 reject 两个函数', done => {
    new Promise((resolve, reject) => {
      assert.isFunction(resolve)
      assert.isFunction(reject)
      done()
    })
  })
  it('promise.then(success) 中的 success 会在 resolve 被调用后执行', done => {
    let success = sinon.fake()
    const promise = new Promise((resolve, reject) => {
      assert.isFalse(success.called)
      resolve()
      // 这里只有等一会才能断言 called = true
      // 因为顺序是先 then -> 调用 success -> 调用 succeed
      // 而 succeed 是放入了 setTimeout 中的
      setTimeout(() => { 
        assert(success.called)
        // 如果代码里面需要异步的测试，则需要加 done
        // 表示异步测试的完成，告诉 mocha 可以检查其测试结果了
        // 不然很多个任务都是异步测试的话，mocha 就不知道哪个是先完成的(这里 mocha 对于测试用例是一个一个同步执行的)
        done()
      });
    })
    // @ts-ignore
    promise.then(success)
  })
  it('promise.then(null, fail) 中的 fail 会在 reject 被调用后执行', done => {
    let fail = sinon.fake()
    const promise = new Promise((resolve, reject) => {
      assert.isFalse(fail.called)
      reject()
      setTimeout(() => { 
        assert(fail.called)
        done()
      });
    })
    // @ts-ignore
    promise.then(null, fail)
  })
  it('2.2.1 onFulfilled 和 onRejected 都是可选的参数', () => {
    const promise = new Promise(resovle => {
      resovle()
    })

    promise.then(false, null)
  })
  it(`2.2.2.1 此函数必须在 promise 完成(fulfilled) 后被调用,并把 promise 的值作为它的第一个参数
    2.2.2.2 此函数在promise完成(fulfilled)之前绝对不能被调用
    2.2.2.3 此函数绝对不能被调用超过一次
  `, done => {
    const success = sinon.fake()
    let promise = new Promise((resolve, reject) => {
      assert.isFalse(success.called)
      resolve('hi')
      resolve('hii')
      setTimeout(() => {
        assert(promise.state === 'fulfilled')
        assert(success.calledOnce)
        assert(success.calledWith('hi'))
        done()
      }, 0)
    })

    promise.then(success)
  })

  it(`2.2.3.1 此函数必须在promise rejected后被调用,并把promise 的reason作为它的第一个参数
    2.2.3.2 此函数在promise rejected之前绝对不能被调用
    2.2.3.3 此函数绝对不能被调用超过一次
  `, done => {
    const fail = sinon.fake()
    let promise = new Promise((resolve, reject) => {
      assert.isFalse(fail.called)
      reject('hi')
      reject('hii')
      setTimeout(() => {
        assert(promise.state === 'rejected')
        assert(fail.calledOnce)
        assert(fail.calledWith('hi'))
        done()
      }, 0)
    })

    promise.then(null, fail)
  })
  it('2.2.4 在我的代码执行完之前，不得调用 then 后面的两个函数', done => {
    const success = sinon.fake()
    const promise = new Promise(resolve => {
      resolve()
    })
    promise.then(success)
    // 这个时候代码还没有执行完，success 函数还没有被调用
    assert.isFalse(success.called)
    setTimeout(() => {
      // 这个时候代码执行完了，success 函数被调用了
      assert(success.called)
      done()
    }, 0)
  })

  it('2.2.4 失败回调', done => {
    const fail = sinon.fake()
    const promise = new Promise((resolve, reject) => {
      reject()
    })
    promise.then(null, fail)
    assert.isFalse(fail.called)
    setTimeout(() => {
      assert(fail.called)
      done()
    }, 0)
  })
  it('2.2.5 onFulfilled和onRejected必须被当做函数调用(并且里面没有 this)', done => {
    const promise = new Promise(resolve => {
      resolve()
    })
    promise.then(function() {
      'use strict'
      assert(this === undefined)
      done()
    })
  })
  it('2.2.5 失败回调', done => {
    const promise = new Promise((resolve, reject) => {
      reject()
    })
    promise.then(null, function() {
      'use strict'
      assert(this === undefined)
      done()
    })
  })
  it('2.2.6 then可以在同一个promise里被多次调用', done => {
    const promise = new Promise(resolve => {
      resolve()
    })
    const callbacks = [sinon.fake(), sinon.fake(), sinon.fake()]
    promise.then(callbacks[0])
    promise.then(callbacks[1])
    promise.then(callbacks[2])

    setTimeout(() => {
      assert(callbacks[0].called)
      assert(callbacks[1].called)
      assert(callbacks[2].called)
      // 如果/当 promise 完成执行（fulfilled）,各个相应的onFulfilled回调 必须根据最原始的then 顺序来调用
      assert(callbacks[1].calledAfter(callbacks[0]))
      assert(callbacks[2].calledAfter(callbacks[1]))
      done()
    }, 0)
  })
  it('2.2.6 失败回调', done => {
    const promise = new Promise((resolve, reject) => {
      reject()
    })
    const callbacks = [sinon.fake(), sinon.fake(), sinon.fake()]
    promise.then(null, callbacks[0])
    promise.then(null, callbacks[1])
    promise.then(null, callbacks[2])

    setTimeout(() => {
      assert(callbacks[0].called)
      assert(callbacks[1].called)
      assert(callbacks[2].called)
      // 如果/当 promise 完成执行（fulfilled）,各个相应的onFulfilled回调 必须根据最原始的then 顺序来调用
      assert(callbacks[1].calledAfter(callbacks[0]))
      assert(callbacks[2].calledAfter(callbacks[1]))
      done()
    }, 0)
  })
  it('2.2.7 then必须返回一个promise', () => {
    const promise = new Promise(resolve => {
      resolve()
    })
    const promise2 = promise.then(() => {})
    assert(promise2 instanceof Promise)
  })
  it(`2.2.7.1 如果 then(success, fail) 中的 success 返回一个值 x, 
    运行 Promise Resolution Procedure [[Resolve]](promise2, x)`, done => {
    const promise = new Promise(resolve => {
      resolve()
    })
    promise.then(() => '123').then((result) => {
      assert.equal(result, '123')
      done()
    })
  })
  it(`2.2.7.1.2 success 的返回值是一个 promise 实例`, done => {
    const promise = new Promise(resolve => {
      resolve()
    })
    const fn = sinon.fake()
    promise
      .then(() => new Promise((resolve) => resolve()))
      .then(fn)
    setTimeout(() => {
      assert(fn.called)
      done()
    }, 0) // 源码部分使用了 process.nextTick 解决了，因为这个是微任务，优先级更高
    // 意味着 fn 会更快的执行(因为比 setTimeout 快)
  })
  it(`2.2.7.1.2 success 的返回值是一个 promise 实例, 且失败了`, done => {
    const promise = new Promise(resolve => {
      resolve()
    })
    const fn = sinon.fake()
    promise
      .then(() => new Promise((resolve, reject) => reject()))
      .then(null, fn)
    setTimeout(() => {
      assert(fn.called)
      done()
    }, 0)
  })
  it(`2.2.7.1.2 fail 的返回值是一个 promise 实例`, done => {
    const promise = new Promise((resolve, reject) => {
      reject()
    })
    const fn = sinon.fake()
    promise
      .then(null, () => new Promise((resolve, reject) => resolve()))
      .then(fn)
    setTimeout(() => {
      // 这里主要看 promise.then 里的 Promise
      // 如果是成功则调用 succeed 函数
      // 如果是失败则调用 fail 函数
      assert(fn.called)
      done()
    }, 0)
  })
  it(`2.2.7.1.2 fail 的返回值是一个 promise 实例, 且失败了`, done => {
    const promise = new Promise((resolve, reject) => {
      reject()
    })
    const fn = sinon.fake()
    promise
      .then(null, () => new Promise((resolve, reject) => reject()))
      .then(null, fn)
    setTimeout(() => {
      assert(fn.called)
      done()
    }, 0)
  })
  it('2.2.7.2 如果success抛出一个异常e,promise2 必须被拒绝', done => {
    const promise = new Promise(resolve => {
      resolve()
    })
    const error = new Error()
    const fn = sinon.fake()
    promise
      .then(() => { throw error })
      .then(null, fn)
    setTimeout(() => {
      assert(fn.called)
      assert(fn.calledWith(error))
      done()
    }, 0)
  })
  it('2.2.7.2 如果fail抛出一个异常e,promise2 必须被拒绝', done => {
    const promise = new Promise((resolve, reject) => {
      reject()
    })
    const error = new Error()
    const fn = sinon.fake()
    promise
      .then(null, () => { throw error })
      .then(null, fn)
    setTimeout(() => {
      assert(fn.called)
      assert(fn.calledWith(error))
      done()
    }, 0)
  })
})

describe('Promise API', () => {
  it('测试 resolve', done => {
    const promise = Promise.resolve2(123)
    assert(promise instanceof Promise)
    promise.then(result => {
      assert(result === 123)
      done()
    })
    const promise2 = Promise.resolve2(new Promise(() => {}))
    assert(promise2 instanceof Promise)
  })
  it('测试 resolve thenable', done => {
    const promise2 = Promise.resolve2({
      then(resolve, reject) { resolve('233') }
    })
    assert(promise2 instanceof Promise)
    promise2.then(result => {
      assert(result === '233')
      done()
    })
  })
  it('测试 reject', done => {
    const promise = Promise.reject2(123)
    assert(promise instanceof Promise)
    promise.then(null, result => {
      assert(result === 123)
      done()
    })
  })
  it('测试 catch', done => {
    const promise = new Promise(resolve => {
      resolve()
    })
    const fn = sinon.fake()
    promise
      .then(result => { throw '233' })
      .catch((e) => { assert(e === '233') })
      .then(fn)

    setTimeout(() => {
      assert(fn.called)
      done()
    }, 0)
  })
  it('测试 finally', () => {
    const promise = new Promise(resolve => {
      resolve()
    })
    const callbacks = [sinon.fake(), sinon.fake(), sinon.fake()]
    promise
      .then(() => { throw 'error' })
      .catch(callbacks[0])
      .finally(callbacks[1])
      .then(callbacks[2])
    
    setTimeout(() => {
      assert(callbacks[0].called)
      assert(callbacks[1].called)
      assert(callbacks[2].called)
      assert(callbacks[2].calledAfter(callbacks[1]))
    }, 0)
  })

  it('测试 all, 等待所有都完成(或第一个失败) ', done => {
    const promise1 = Promise.resolve2(3)
    const promise2 = 1337
    const promise3 = new Promise((resolve, reject) => {
      resolve('foo')
    }) 
    let ret
    Promise.all([promise1, promise2, promise3]).then(results => { 
      ret = results
    })
    setTimeout(() => {
      assert(ret[0] === 3)
      assert(ret[1] === 1337)
      assert(ret[2] === 'foo')
      done()
    }, 10)
  })
  it('测试 allSettled', done => {
    const promise1 = Promise.resolve2(3)
    const promise2 = new Promise((resolve, reject) => reject('foo'))
    const promises = [promise1, promise2]

    let ret
    Promise.allSettled(promises).then(results => {
      ret = results
    })
    setTimeout(() => {
      assert(ret[0].state === 'fulfilled' && ret[0].result === 3)
      assert(ret[1].state === 'rejected' && ret[1].reason === 'foo')
      done()
    }, 10)
  })
})