import { promisify } from "util"

class PromiseComplex {
  state = 'pending'
  callbacks = [] // 用来保存成功以及失败回调的数组
  private resolveOrReject(state, data, index) {
    if (this.state !== 'pending') return 
    this.state = state
    nextTick(() => {
      // 遍历 callbacks, 调用所有的 handle
      this.callbacks.forEach(handle => {
        const fn = handle[index]
        const nextPromise = handle[2]
        if (typeof fn === 'function') {
          // 这里调用的时候有可能报错
          let x
          try {
            x = fn.call(undefined, data)
          } catch (e) {
            // 2.2.7.2 如果onFulfilled或onRejected抛出一个异常e
            // promise2 必须被拒绝（rejected）并把e当作原因
            return nextPromise.reject(e)
          }
          // 2.2.7.1 如果onFulfilled或onRejected返回一个值x,
          // 运行 Promise Resolution Procedure [[Resolve]](promise2, x)
          // promise2 表示第二个 promise
          nextPromise.resolveWith(x)
        }
      })
    })
  }

  static resolve2(result) {
    if (result instanceof PromiseComplex) return result
    return new PromiseComplex((resolve, reject) => {
      if (result && result.then && typeof result.then === 'function') {
        result.then(resolve, reject)
      } else {
        resolve(result)
      }
    })
  }

  static reject2(reason) {
    return new PromiseComplex((resolve, reject) => {
      reject(reason)
    })
  }

  catch(reject) {
    return this.then(null, reject)
  }

  finally(callback) {
    // 无论成功或者失败，都会走到 finally 中
    // finally 还可以继续 then
    return this.then(
      (result) => {
        return PromiseComplex.resolve2(callback()).then(() => result)
      },
      (error) => {
        return PromiseComplex.resolve2(callback()).then(() => {throw error})
      }
    )
  }

  static all(promises) {
    return new PromiseComplex((resolve, reject) => {
      let index = 0
      // 5. 在任何情况下，Promise.all 返回的 promise 的完成状态的结果都是一个数组
      let resultArray = []
      // 1. 如果传入的参数是一个空的可迭代对象，
      // 那么此promise对象回调完成(resolve),
      // 只有此情况，是同步执行的，其它都是异步返回
      if (promises && promises.length === 0) {
        return resolve(resultArray)
      }

      const processResult = (result, i) => {
        resultArray[i] = result
        // 2. promises 中所有的promise都“完成”时
        // 或参数中(result)不包含 promise 时回调完成。
        if (++index === promises.length) resolve(resultArray)
      }
      for (let i = 0; i < promises.length; i++) {
        // 3. 如果传入的参数(promises[i])不包含任何 promise，则返回一个异步完成
        PromiseComplex.resolve2(promises[i])
          .then(
            result => processResult(result, i),
            // 4. 如果参数中有一个promise失败，那么Promise.all返回的promise对象失败
            reason => reject(reason)
          )
      }
    })
  }
  // draft
  static allSettled(promises) {
    return new PromiseComplex((resolve, reject) => {
      let index = 0
      let resultArray = []
      if (promises && promises.length === 0) return resolve(resultArray)

      const processResult = (result, i, state) => {
        resultArray[i] = state === 'fulfilled'
          ? {state, result}
          : {state, reason: result}
        if (++index === promises.length) resolve(resultArray)
      }
      for (let i = 0; i < promises.length; i++) {
        PromiseComplex.resolve2(promises[i])
          .then(
            result => processResult(result, i, 'fulfilled'),
            reason => processResult(reason, i, 'rejected')
          )
      }
    })
  }

  static race(promises) {
    return new PromiseComplex((resolve, reject) => {
      if (promises && promises.length === 0) return 
      for (let i = 0; i < promises.length; i++) {
        PromiseComplex.resolve2(promises[i])
        .then(
          // 谁(promises[i]) 先完成谁先 resolve
          result => resolve(result),
          reason => reject(reason)
        )
      }
    })
  }

  resolve(result) {
    this.resolveOrReject('fulfilled', result, 0)
  }
  reject(reason) {
    this.resolveOrReject('rejected', reason, 1)
  }
  constructor(fn) {
    if (typeof fn !== 'function') {
      throw new Error('这里只接受函数')
    }
    fn(this.resolve.bind(this), this.reject.bind(this))
  }

  then(succeed?, fail?) {
    const handle = []
    if (typeof succeed === 'function') {
      handle[0] = succeed
    }
    if (typeof fail === 'function') {
      handle[1] = fail
    }
    // 将下一个 promise 放入 handle[2] 中
    handle[2] = new PromiseComplex(() => {})
    // 将函数 push 进 callbacks 中
    this.callbacks.push(handle)
    return handle[2]
  }

  private resolveWithSelf() {
    // 2.3.1 如果promise和x引用同一个对象，则用TypeError作为原因拒绝（reject）promise
    // 这里的 this 就是 promise2，即下一个 promise
    return this.reject(new TypeError())
  }
  private resolveWithPromise(x) {
    // 2.3.2 如果x是一个promise,采用promise的状态
    x.then(
      result => this.resolve(result), 
      reason => this.reject(reason)
    )
  }
  private resolveWithThenable(then, x) {
    // 2.3.3.3 如果then是一个方法，把x当作this来调用它， 第一个参数为 resolvePromise，第二个参数为rejectPromise
    if (then instanceof Function) {
      try {
        then.call(x, y => this.resolveWith(y), r => this.resolveWith(r))
      } catch (e) {
        this.reject(e)
      }
    } else {
      // 2.3.3.4 如果then不是一个函数，用x完成(fulfill)promise
      this.resolve(x)
    }
  }
  private getThen(x) {
    // 2.3.3另外，如果x是个对象或者方法
    let then
    // 2.3.3.2 如果取回的x.then属性的结果为一个异常e,用e作为原因reject promise
    try {
      then = x.then
    } catch (e) {
      return this.reject(e)
    }
    return then
  }
  private resolveWithObject(x) {
    let then = this.getThen(x)
    this.resolveWithThenable(then, x)
  }

  private resoleWithOthers(x) {
    // 2.3.4 如果 x既不是对象也不是函数，用x完成(fulfill)promise
    this.resolve(x)
  }

  private resolveWith(x) {
    if (this === x) { 
      return this.resolveWithSelf()
    } else if (x instanceof PromiseComplex) {
      this.resolveWithPromise(x)
    } else if (x instanceof Object) {
      this.resolveWithObject(x)
    } else {
      this.resoleWithOthers(x)
    }
  }
}

// 兼容 process.nextTick 和 setImmediate 方案
// 其实就是 vue 里面的 nextTick 方案
// 主要是用 mutationObserver 实现的，这个只要改动下 dom 去更新一个函数
// 而在这个函数里面去做操作即可，这个是比 setTimeout 要快的
function nextTick(fn) {
  // 兼容处理
  if (process !== undefined && typeof process.nextTick === 'function') {
    return process.nextTick(fn)
  }

  var counter = 1
  var observer = new MutationObserver(fn)
  var textNode = document.createTextNode(String(counter))

  // 监听节点变化
  observer.observe(textNode, { characterData: true })

  // 修改节点
  counter = (counter + 1) % 2
  textNode.data = String(counter)
}

export default PromiseComplex