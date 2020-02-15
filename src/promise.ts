class PromiseEasy {
  state = 'pending'
  callbacks = [] // 用来保存成功以及失败回调的数组
  resolve(result) {
    setTimeout(() => {
      if (this.state !== 'pending') return 
      this.state = 'fulfilled'
      // 遍历 callbacks, 调用所有的 handle
      this.callbacks.forEach(handle => {
        const succeed = handle[0]
        if (typeof succeed === 'function') {
          succeed.call(undefined, result)
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
        if (typeof fail === 'function') {
          fail.call(undefined, reason)
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
    // 将函数 push 进 callbacks 中
    this.callbacks.push(handle)
  }
}

export default PromiseEasy