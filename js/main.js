/**
 * Created by admin on 13-11-9.
 */

String.prototype.trim = function () {
  return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '')
}

var app = {
  version: BS.b$.App.getAppVersion(),

  // 启动
  start: function () {
    this.initControls()
  },

  // 初始化控件
  initControls: function () {
    this._initPingValue()
    this._initPingBtn()
    this._setLogger()

    // 设置右键菜单项
    // try {
    //   var params = {
    //     'WebMenuItemTagReload': 0
    //   };




    //   var str = JSON.stringify(params);
    //   (typeof macgap) && macgap.menuitems_settings.setWebMenuItemsSettings(str)
    // } catch (e) {
    //   console.log(e)
    // }
  },

  // 初始化pingValue
  _initPingValue: function () {
    var tip = 'website: eg. www.bing.com; 202.89.233.104; https://www.bing.com'
    $('#pingValue').attr('value', tip)
    $('#pingValue').css({
      'color': 'gray',
      'font-size': '12px'
    })
    $('#pingValue').on('focus', function () {
      if (this.value == tip) {
        this.value = ''
        $('#pingValue').css({
          'color': 'rgb(17, 189, 243)',
          'font-size': '22px'
        })
      }
    })

    $('#pingValue').on('blur', function () {
      if (this.value == '') {
        this.value = tip
        $('#pingValue').css({
          'color': 'gray',
          'font-size': '12px'
        })
      }
    })
  },

  // 初始化按钮控件
  _initPingBtn: function () {
    $('#pingBtn').on('click', function () {
      var url = $('#pingValue').val()

      // 验证url的合法性
      var trimUrl = url.trim()
      if (!trimUrl.match(/^(http|https|ftp):/i)) {
        url = 'http://' + trimUrl
      }

      PingCI.maxPingCount = 4
      PingCI.getStatisticsCbHandler = function (obj) {
        log && log(obj)
      }
      PingCI.startWithUrl(url, 2000, function (obj) {
        log && log(obj)
      })
    })
  },

  _setLogger: function () {
    Logger['version'] = app.version;
    Logger.show()

    $('div#logger').css({
      'font-family': 'arial',
      'font-size': '11px'
    })
  }
}

var PingCI = {
  intTimerID: null,
  intStartTime: null, // 初始化的时间
  intTimeout: 2000, // ms
  maxPingCount: Number.MAX_VALUE, // 最大ping的次数
  sumPingCount: 0, // 累计Ping的次数

  objIMG: null, // Image对象
  bolIsRunning: false,
  bolIsTimeout: false,

  intSent: 0,
  arrDelays: [],
  strURL: '',
  getStatisticsCbHandler: null,

  ping: function () {
    /*
     * 发送请求
     */
    PingCI.intStartTime = +new Date()
    PingCI.intSent++

      PingCI.objIMG.src = PingCI.strURL + '/' + PingCI.intStartTime
    PingCI.bolIsTimeout = false

    /*
     * 超时计时
     */
    PingCI.intTimerID = setTimeout(function () {
      if (!PingCI.bolIsRunning)
        return

      PingCI.bolIsTimeout = true
      PingCI.objIMG.src = 'X:\\'

      log && log('Request timed out.')
      PingCI.sumPingCount++
        if (PingCI.sumPingCount == PingCI.maxPingCount + 1) {
          PingCI.stopAndGetStatistics()
        }

      PingCI.ping()
    }, PingCI.intTimeout)
  },

  //
  /**
   * 启动，然后开始计算
   * @param url 正确的url地址，已经被处理过的
   * @param timeOutms 超时秒数，一般要大于1000ms
   * @param callback  启动后的回调函数
   */
  startWithUrl: function (url, timeOutms, callback) {
    this.strURL = url
    if (this.strURL.length == 0) {
      console.error('url 不能为空')
      return
    }

    this.intTimeout = timeOutms || 2000
    isNaN(this.intTimeout) && (this.intTimeout = 2000);
    (this.intTimeout < 1000) && (this.intTimeout = 1000)

    this.bolIsRunning = true
    this.arrDelays = []
    this.intSent = 0
    this.sumPingCount = 0

    callback && callback('Pinging ' + this.strURL + ':')

    function logInfo() {
      /*
       * 有回应,取消超时计时
       */
      clearTimeout(PingCI.intTimerID)
      PingCI.sumPingCount++
        if (PingCI.sumPingCount == PingCI.maxPingCount + 1) {
          PingCI.stopAndGetStatistics()
        }

      if (!PingCI.bolIsRunning || PingCI.bolIsTimeout)
        return

      var delay = new Date() - PingCI.intStartTime

      log && log('Reply from ' +
        PingCI.strURL +
        ' time' +
        ((delay < 1) ? ('<1') : ('=' + delay)) +
        'ms')
      PingCI.arrDelays.push(delay)

      /*
       * 每次请求间隔限制在1秒以上
       */
      setTimeout(PingCI.ping, delay < 1000 ? (1000 - delay) : 1000)
    }

    PingCI.objIMG = new Image()
    PingCI.objIMG.onload = logInfo
    PingCI.objIMG.onerror = logInfo

    this.ping()
  },

  /**
   * 停止，然后拿到统计结果
   * @param cb 回调函数，将结果输出
   */
  stopAndGetStatistics: function (cb) {
    if (this.bolIsRunning) {
      /*
       * 停止
       */
      var intRecv = this.arrDelays.length
      if (this.intSent > this.maxPingCount) this.intSent = this.maxPingCount
      var intLost = this.intSent - intRecv
      var sum = 0

      for (var i = 0; i < intRecv; i++)
        sum += this.arrDelays[i]

      this.bolIsRunning = false

      var resultLog = ''

      /*
       * 统计结果
       */
      resultLog += 'Ping statistics for ' + this.strURL + ': \n'
      resultLog += '==>Packets: Sent = ' +
        this.intSent +
        ', Received = ' +
        intRecv +
        ', Lost = ' +
        intLost +
        ' (' +
        Math.floor(intLost / this.intSent * 100) +
        '% loss)'

      if (intRecv != 0) {
        resultLog += ',\n...Approximate round trip times in milli-seconds: \n'
        resultLog += '...Minimum = ' +
          Math.min.apply(this, this.arrDelays) +
          'ms, Maximum = ' +
          Math.max.apply(this, this.arrDelays) +
          'ms, Average = ' +
          Math.floor(sum / intRecv) +
          'ms'
      }
      resultLog += '\n'

      var callback = cb || this.getStatisticsCbHandler
      callback && callback(resultLog)
    }
  }

}


//-----------------------------------------------------------------------------------------------------------------
$(document).ready(function () {
    app.start();
});

