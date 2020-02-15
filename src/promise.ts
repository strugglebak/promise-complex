class PromiseComplex {
  state = 'pending'
  callbacks = [] // 用来保存成功以及失败回调的数组
  resolve(result) {
    setTimeout(() => {
      if (this.state !== 'pending') return 
      this.state = 'fulfilled'
      // 遍历 callbacks, 调用所有的 handle
      this.callbacks.forEach(handle => {
        const succeed = handle[0]
        const nextPromise = handle[2]
        if (typeof succeed === 'function') {
          const x = succeed.call(undefined, result)
          // 2.2.7.1 如果onFulfilled或onRejected返回一个值x,
          // 运行 Promise Resolution Procedure [[Resolve]](promise2, x)
          // promise2 表示第二个 promise
          nextPromise.resolveWith(x)
        }
      })
    }, 0)
  }
  reject(reason) {
    setTimeout(() => {
      if (this.state !== 'pending') return 
      this.state = 'rejected'
      // 遍历 callbacks, 调用所有的 handle
      this.callbacks.forEach(handle => {
        const fail = handle[1]
        const nextPromise = handle[2]
        if (typeof fail === 'function') {
          const x = fail.call(undefined, reason)
          nextPromise.resolveWith(x)
        }
      })
    }, 0)
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

  resolveWith(x) {
    // 2.3.1 如果promise和x引用同一个对象，则用TypeError作为原因拒绝（reject）promise
    if (this === x) { // 这里的 this 就是 promise2，即下一个 promise
      return this.reject(new TypeError())
    } else if (x instanceof PromiseComplex) {
      // 2.3.2 如果x是一个promise,采用promise的状态
      x.then(
        result => this.resolve(result), 
        reason => this.reject(reason)
      )
    } else if (x instanceof Object) {
      // 2.3.3另外，如果x是个对象或者方法
      let then
      // 2.3.3.2 如果取回的x.then属性的结果为一个异常e,用e作为原因reject promise
      try {
        then = x.then
      } catch (e) {
        return this.reject(e)
      }
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
    } else {
      // 2.3.4 如果 x既不是对象也不是函数，用x完成(fulfill)promise
      this.resolve(x)
    }
  }
}

export default PromiseComplex