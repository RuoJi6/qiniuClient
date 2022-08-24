const fs = require('fs')

import { Constants, util } from '../service/index'
import brand from './brand'
import baseBucket from './baseBucket'
import tencent from './tencent'

class Bucket extends baseBucket {
  constructor(bucketInfo, cos) {
    super(bucketInfo, cos, brand.tencent.key)

    this.param = {
      Bucket: this.name,
      Region: this.location,
    }
  }

  /**
   * 根据privateBuckets判断是否是私有空间
   * 获取域名
   * 获取目录
   * 获取默认资源列表
   * @param vm => page
   */
  bindPage(vm) {
    this.vm = vm
    this.paging = this.vm.paging

    if (this.location) {
      this.getACL()
      // this.getDomains();
    }
  }

  /**
   * 获取Bucket访问权限状态
   */
  getACL() {
    this.cos.getBucketAcl(this.param, (err, data) => {
      this.setPermission(data.ACL === 'private' ? 1 : 0)
      this.getDomains()
    })
  }

  getDomains() {
    this.cos.getBucketDomain(this.param, (err, data) => {
      if (!err) {
        let domains = data.DomainRule.filter(domain => {
          return domain.Status === 'ENABLED'
        })
        this.domains = domains.map(domain => {
          return domain.Name
        })

        //匹配最近使用过的域名
        super.setRecentDomain()
      } else {
        console.error(err)
      }
      //有些可能没有获取domain的权限，但不代表没有获取资源列表的权限
      this.getResources()
    })
  }

  createFile(_param, type = Constants.UploadType.UPLOAD, callback) {
    if (type === Constants.UploadType.FETCH) {
      tencent.fetch({ ..._param, ...this.param }, callback)
    } else if (type === Constants.UploadType.UPLOAD) {
      let param = {
        ...this.param,
        Key: _param.key,
        Body: fs.createReadStream(_param.path),
        ContentLength: fs.statSync(_param.path).size,
        onProgress: function (progressData) {
          _param.progressCallback(progressData.percent * 100)
        },
      }

      this.cos.putObject(param, (err, data) => {
        callback(err, { key: _param.key })
      })
    }
  }

  removeFile(items, callback) {
    tencent.remove(this.param, items, async (err, data) => {
      await super.syncDB(items, Constants.DBAction.delete)
      callback && callback(err, data)
    })
  }

  renameFile(items, callback) {
    tencent.rename(this.param, items, async (err, data) => {
      await super.syncDB(items, Constants.DBAction.rename)
      callback && callback(err, data)
    })
  }

  async getResources(option = {}) {
    await super.preResources()
    let params = {
      ...this.param,
    }

    this._handleParams(params, option, {
      prefix: 'Prefix',
      delimiter: 'Delimiter',
      marker: 'Marker',
      limit: 'MaxKeys',
    })

    this.cos.getBucket(params, (err, data) => {
      if (err) {
        console.error(err)
      } else {
        let files = []
        data.Contents.forEach(item => {
          if (parseInt(item.Size) !== 0) {
            files.push(util.convertMeta(item, brand.tencent.key))
          }
        })
        //commonPrefixes 文件夹
        data.CommonPrefixes &&
          data.CommonPrefixes.forEach(item => {
            files.push(this._getFolder(item.Prefix))
          })

        this.postResources(
          {
            items: files,
            marker: data.NextMarker,
          },
          option,
        )
      }
    })
  }

  /**
   * 返回资源真实链接
   * @param index
   * @param key
   * @param deadline  私有模式,文件有效期
   * @returns {*}
   */
  generateUrl(key, deadline) {
    let params = {
      ...this.param,
      Key: key,
      Expires: deadline,
      Sign: this.permission === 1, //是否需要签名
    }

    let url = this.cos.getObjectUrl(params)

    if (this.domain) {
      let obj = new URL(url)
      url = url.replace(obj.origin, this.domain)
    }

    return super.generateUrl(url)
  }
}

export default Bucket
