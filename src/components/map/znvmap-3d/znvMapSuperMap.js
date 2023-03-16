const Cesium = window.Cesium
let viewer = null

class Map {
  constructor(mapId, opts) {
    opts = Object.assign(
      {
        center: [120.422167, 36.117018, 10000]
      },
      opts
    )
    // 初始化viewer部件
    viewer = new Cesium.Viewer(mapId, {
      navigation: false,
      infoBox: false
    })
    // 添加高德地图并使用插件纠偏
    viewer.imageryLayers.addImageryProvider(new Cesium.AmapImageryProvider({
      url: 'http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}',
      crs: 'WGS84'
    }))
    // viewer.imageryLayers.addImageryProvider(
    //   new Cesium.UrlTemplateImageryProvider({
    //     url: "http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}",
    //   })
    // )
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(opts.center[0], opts.center[1], opts.center[2]),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-90.0)
      }
    })
    this.viewer = viewer
    const promise = new Promise((resolve, reject) => {
      resolve(this)
    })
    return promise
  }

  _on(type, callback) {
    let handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((event) => {
      var pick = viewer.scene.pick(event.position)
      // 选中某模型   pick选中的对象
      if (pick && pick.id) {
        console.log('选中', pick.id)
        callback(pick.id)
      }
    }, Cesium.ScreenSpaceEventType[type])
  }

  _addCircleScan(opts) {
    window.addCircleScan(viewer, {
      lon: opts.center[0], // 经度
      lat: opts.center[1], // 纬度
      r: opts.radiu, // 扫描半径
      scanColor: new Cesium.Color(1.0, 0.0, 0.0, 1), // 颜色注意必须是var scanColor = new Cesium.Color(1.0, 0.0, 0.0, 1);rgba形式的‘red’和‘#fff’都不行
      interval: 3000 // 时间
    })
  }

  _openSCP(src, callback) {
    // 打开所发布三维服务下的所有图层
    var promise = viewer.scene.open(src, undefined, {
      autoSetView: false // 不自动定位
    })
    Cesium.when.all(
      promise,
      function (layers) {
        callback(layers)
      },
      function (e) {
        console.log('加载SCP失败，请检查网络连接状态或者url地址是否正确？')
      }
    )
  }

  _flyTo(opts) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(opts.center[0], opts.center[1], opts.center[2]),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-90.0)
      }
    })
  }

  _addCesium3DTileset(url, style) {
    // 加载倾斜摄影模型
    var tileset = new Cesium.Cesium3DTileset({
      url: url,
      isSuperMapiServer: false
    })
    viewer.scene.primitives.add(tileset)
    viewer.zoomTo(tileset)
    return tileset
  }

  _removeCesium3DTileset(tileset) {
    viewer.scene.primitives.remove(tileset)
  }

  _addWeixing() {
    let weixingLayer1 = viewer.imageryLayers.addImageryProvider(
      new Cesium.AmapImageryProvider({
        style: 'img',
        crs: 'WGS84'
      })
    )
    let weixingLayer2 = viewer.imageryLayers.addImageryProvider(
      new Cesium.AmapImageryProvider({
        style: 'cva',
        crs: 'WGS84'
      })
    )
    return [weixingLayer1, weixingLayer2]
  }

  _removeWeixing(weixingLayerList) {
    weixingLayerList.forEach(e => {
      viewer.imageryLayers.remove(e)
    })
  }
}

class Entity {
  _addToMap() {
    viewer.entities.add(this.entity)
  }

  _removeFromMap() {
    viewer.entities.remove(this.entity)
  }
}

class Marker extends Entity {
  constructor(opts) {
    super()
    let entity = new Cesium.Entity({
      id: opts.id,
      position: Cesium.Cartesian3.fromDegrees(opts.position.lng, opts.position.lat, opts.position.height), // 第三位是高度，在3d中，高度数值小可能被遮挡
      billboard: {
        // 图标
        disableDepthTestDistance: Number.POSITIVE_INFINITY, // 设为这样，不被遮挡
        image: opts.icon || 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
        width: opts.size.width,
        height: opts.size.height
      }
    })
    this.entity = entity
    this.opts = opts
    return this
  }

  _getPosition() {
    return [this.opts.position.lng, this.opts.position.lat, this.opts.position.height]
  }
}

/**
 * @description: 将图片和文字合成新图标使用（参考Cesium源码）
 * @param {*} label：文字
 * @return {*} 返回canvas
 */
function getPin(label) {
  // 创建画布对象
  const pinBuilder = new Cesium.PinBuilder()
  let color = null
  if (label >= 20) {
    color = Cesium.Color.ORANGE
  } else if (label >= 12) {
    color = Cesium.Color.YELLOW
  } else if (label >= 8) {
    color = Cesium.Color.GREEN
  } else {
    color = Cesium.Color.BLUE
  }
  const pin = pinBuilder.fromText(label, color, 48).toDataURL()
  return pin
}

class MarkerClusterer {
  constructor(markers, opts) {
    const dataSource = new Cesium.CustomDataSource('myData')
    // 设置聚合参数
    dataSource.clustering.enabled = true
    dataSource.clustering.pixelRange = opts.pixelRange || 50
    dataSource.clustering.minimumClusterSize = opts.minClusterSize || 5

    dataSource.clustering.clusterEvent.addEventListener(function (clusteredEntities, cluster) {
      // 关闭自带的显示聚合数量的标签
      cluster.label.show = false
      cluster.billboard.show = true
      cluster.billboard.id = cluster.label.id
      cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM
      cluster.billboard.image = getPin(clusteredEntities.length)
    })
    markers.forEach((e, index) => {
      dataSource.entities.add(e.entity)
    })
    viewer.dataSources.add(dataSource)
    this.dataSource = dataSource
    return this
  }

  _addMarkers(markers) {
    markers.forEach((e, index) => {
      this.dataSource.entities.add(e.entity)
    })
  }

  _removeMarkers(removeMarkers) {
    removeMarkers.forEach((e, index) => {
      this.dataSource.entities.remove(e.entity)
    })
  }

  _clearMarkers() {
    this.dataSource.entities.removeAll()
  }
}

class Circle extends Entity {
  constructor(opts) {
    super()
    let entity = new Cesium.Entity({
      id: opts.id,
      position: Cesium.Cartesian3.fromDegrees(opts.center[0], opts.center[1]),
      ellipse: {
        semiMinorAxis: opts.radiu,
        semiMajorAxis: opts.radiu,
        height: opts.height,
        material: Cesium.Color.fromCssColorString('rgba(255, 185, 181, 0.8)'),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('rgba(255, 229, 227, 1)'),
        outlineWidth: 3
      }
    })
    this.entity = entity
    this.opts = opts
    return this
  }

  _changeRadiu(r) {
    this.opts.radiu = r
    this.entity.ellipse.semiMinorAxis = r
    this.entity.ellipse.semiMajorAxis = r
  }

  _contain(markers) {
    let Util = new Zmap.Util()
    return markers.filter((e) => {
      let startP = Cesium.Cartesian3.fromDegrees(this.opts.center[0], this.opts.center[1], 0)
      let ePosition = e._getPosition()
      let endP = Cesium.Cartesian3.fromDegrees(ePosition[0], ePosition[1], 0)
      let positions = [startP, endP]
      return Util.getSpaceDistance(positions) < this.opts.radiu
    })
  }
}

class Draw2D {
  constructor(opts) {
    let draw = new Draw(viewer, { borderColor: Cesium.Color.RED, material: Cesium.Color.BLUE.withAlpha(0.5) }) // viewer 初始化的cesium对象,自定义配置项，可以不用，就使用默认样式
    this.draw = draw
    return this
  }

  /**
   * 圆形区域
   */
  _drawCircle() {
    this.draw.drawCircle()
    return this.draw.backInfoDetail()
  }

  _circleSelect(markers, callback) {
    this.draw.drawCircle((geoInfo) => {
      let Util = new Zmap.Util()
      let res = markers.filter((e) => {
        let startP = Cesium.Cartesian3.fromDegrees(geoInfo.center[0], geoInfo.center[1], 0)
        let ePosition = e._getPosition()
        let endP = Cesium.Cartesian3.fromDegrees(ePosition[0], ePosition[1], 0)
        let positions = [startP, endP]
        return Util.getSpaceDistance(positions) < geoInfo.radius
      })
      callback && callback(res)
    })
  }

  /**
   * 矩形区域
   */
  _drawRectangle() {
    this.draw.drawRectangle()
    return this.draw.backInfoDetail()
  }

  _rectangleSelect(markers, callback) {
    this.draw.drawRectangle((geoInfo) => {
      let coordinates = [
        [geoInfo.position[0], geoInfo.position[1]],
        [geoInfo.position[2], geoInfo.position[3]],
        [geoInfo.position[4], geoInfo.position[5]],
        [geoInfo.position[6], geoInfo.position[7]]
      ]
      let Util = new Zmap.Util()
      let res = markers.filter((e) => {
        let ePosition = e._getPosition()
        return Util.isPointInPolygon({ lng: ePosition[0], lat: ePosition[1] }, coordinates)
      })
      callback && callback(res)
    })
  }

  /**
   * 自定义区域绘制
   */
  _drawPlane() {
    this.draw.drawPlane()
    return this.draw.backInfoDetail()
  }

  _planeSelect(markers, callback) {
    this.draw.drawPlane((geoInfo) => {
      console.log(geoInfo)
      let coordinates = geoInfo.positions
      let Util = new Zmap.Util()
      let res = markers.filter((e) => {
        let ePosition = e._getPosition()
        return Util.isPointInPolygon({ lng: ePosition[0], lat: ePosition[1] }, JSON.parse(JSON.stringify(coordinates)))
      })
      callback && callback(res)
    })
  }

  /**
   * 移除选区  鼠标移动到上面 点击清除
   */
  removeEntity() {
    this.draw.removeEntity()
  }

  clear() {
    this.draw.clear()
  }
}

class Util {
  // 计算距离函数
  getSpaceDistance(positions) {
    var distance = Cesium.Cartesian3.distance(positions[0], positions[1])
    return distance
  }

  /**
   * 计算一个点是否在多边形里
   * @param {Object} pt 标注点
   * @param {Object} poly 多边形数组
   */
  isPointInPolygon(pt, poly) {
    for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
      ((poly[i][1] <= pt.lat && pt.lat < poly[j][1]) || (poly[j][1] <= pt.lat && pt.lat < poly[i][1])) &&
        pt.lng < ((poly[j][0] - poly[i][0]) * (pt.lat - poly[i][1])) / (poly[j][1] - poly[i][1]) + poly[i][0] &&
        (c = !c)
    return c
  }
}

let Zmap = { Map, Marker, MarkerClusterer, Circle, Draw2D, Util }
export default Zmap
