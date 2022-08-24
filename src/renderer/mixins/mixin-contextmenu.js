import { Constants, util, EventBus } from '../service/index'

export default {
  data() {
    return {
      contextFolderMenuIndex: -1,
      contextFileMenuIndex: -1,
      folderInfoDialog: {
        show: false,
        title: '',
        info: '',
      },
      //修改文件(夹)名称
      changeFileNameDialog: {
        show: false,
        input: '',
        file: null,
      },
      //移动文件夹
      moveFilesDialog: {
        show: false,
        input: '',
      },
    }
  },
  methods: {
    selectFile(index) {
      let file
      if (typeof index === 'object') {
        file = index
        index = this.files.indexOf(index)
      } else {
        file = this.files[index]
      }

      if (this.selection.indexOf(index) !== -1) {
        this.selection.splice(this.selection.indexOf(index), 1)

        if (file._directory) {
          this.getFileByPath(file._path).forEach(item => {
            this.bucket.selection.splice(this.bucket.selection.indexOf(item), 1)
          })
        } else {
          this.bucket.selection.splice(this.bucket.selection.indexOf(file), 1)
        }
      } else {
        this.selection.push(index)

        if (file._directory) {
          this.bucket.selection.push(...this.getFileByPath(file._path))
        } else {
          this.bucket.selection.push(file)
        }
      }
    },
    // 0：修改文件（夹）名称 1: 移动文件（夹）
    changeFileName(action = 0) {
      let files = [],
        file,
        oldPath,
        newPath

      switch (action) {
        case 0:
          file = this.changeFileNameDialog.file
          oldPath = file._directory ? file._path : file.key
          // 拼接新路径
          let array = oldPath.split(Constants.DELIMITER)
          array[array.length - 1] = this.changeFileNameDialog.input
          newPath = array.join(Constants.DELIMITER)
          break
        case 1:
          file = this.moveFilesDialog.file
          oldPath = file._directory ? file._path : file.key
          newPath = this.moveFilesDialog.input
          break
      }

      if (file._directory) {
        files = this.bucket.files.filter(file => {
          if (file.key.indexOf(oldPath + Constants.DELIMITER) === 0) {
            file._key = file.key.replace(oldPath, newPath)
            return true
          }
          return false
        })
      } else {
        file._key = newPath
        files.push(file)
      }

      this.resourceRename(files)
    },
    moveFiles() {
      this.changeFileName(1)
    },
    handleFolderMenu(ref) {
      this.contextFolderMenuIndex = ref.data.attrs.index
    },
    handleFolderMenuClick(action) {
      let path = this.contextFolderMenuIndex._path
      let files = []

      switch (action) {
        case 0: //删除操作
          this.resourceRemove(this.getFileByPath(path))
          break
        case 1: //目录详情
          files = this.getFileByPath(path)
          let size = 0
          files.forEach(item => {
            size += item.fsize
          })
          this.folderInfoDialog.show = true
          this.folderInfoDialog.title = `${path}简介`
          this.folderInfoDialog.info = `共${files.length}个文件\n大小：${util.formatFileSize(size)}`
          break
        case 2: //修改文件夹名称
          this.changeFileNameDialog.show = true
          this.changeFileNameDialog.input = this.contextFolderMenuIndex._name
          this.changeFileNameDialog.file = this.contextFolderMenuIndex
          break
        case 3: //多选
          this.selectFile(this.contextFolderMenuIndex)
          break
        case 4: //全选
          this.$parent.allSelection()
          break
        case 5: //刷新CDN
          this.resourceRefreshUrls({ path: path + '/' })
          break
        case 6: //移动文件夹
          this.moveFilesDialog = {
            show: true,
            input: this.contextFolderMenuIndex._path,
            file: this.contextFolderMenuIndex,
          }
          break
      }
    },
    handleFileMenu(ref) {
      this.contextFileMenuIndex = ref.data.attrs.index
    },
    handleFileMenuClick(action) {
      let file = this.contextFileMenuIndex

      switch (action) {
        case 0: //删除操作
          this.resourceRemove(file)
          break
        case 1:
          this.folderInfoDialog.show = true
          this.folderInfoDialog.title = `${util.getPostfix(file.key)}简介`
          this.folderInfoDialog.info = `文件路径：${file.key}\n上传时间：${util.formatDate(file.putTime)}\n大小：${util.formatFileSize(file.fsize)}\nETag：${file.ETag}`
          break
        case 2:
          this.copyFileUrl(file, Constants.CopyType.URL)
          break
        case 3:
          this.copyFileUrl(file, Constants.CopyType.MARKDOWN)
          break
        case 4:
          this.changeFileNameDialog.show = true
          this.changeFileNameDialog.input = util.getPostfix(file.key)
          // this.changeFileNameDialog.input = file.key;
          this.changeFileNameDialog.file = file
          break
        case 5: //选择当前文件
          this.selectFile(file)
          break
        case 6: //下载
          // this.handleDownload(file);
          this.resourceAction(file, Constants.ActionType.download)
          break
        case 7: //全选
          this.$parent.allSelection()
          break
        case 8: //刷新CDN
          this.resourceRefreshUrls(file)
          break
        case 9: //移动文件
          this.moveFilesDialog = {
            show: true,
            input: file.key,
            file: file,
          }
          break
      }
    },
  },
}
