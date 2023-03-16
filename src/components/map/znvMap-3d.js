import coordtransform from './coordtransform'
import ZMap from './znvmap-3d/znvMapSuperMap'
import store from '../../store'

let ZnvMap = {}
let map // 地图对象
let markerClusterLayer
let layerMarks = {}
let eventCircle
let draw
let baimoLayers = null
let jingmoLayers = null
let weixingLayers = null

ZnvMap.start = function (mapId, opts) {
  layerMarks = {}
  return new ZMap.Map(mapId, opts).then((res) => {
    markerClusterLayer = new ZMap.MarkerClusterer([], { pixelRange: 50, minClusterSize: 5 })
    map = res
    map._on('LEFT_CLICK', (data) => {
      if (data.length) {
      } else {
        ZnvMap.clickEvent(layerMarks[data._id])
      }
    })
  })
}

ZnvMap.gotoPoint = function (lnglat) {
  map._flyTo({
    center: [...lnglat, 10000]
  })
}

// 显示隐藏白膜
// 无锡
ZnvMap.showBaimoLayers = function (isShow) {
  if (isShow) {
    baimoLayers = map._addCesium3DTileset('http://10.45.12.95:9999/无锡白模/3d-tiles/tileset.json')
    baimoLayers.style = new Cesium.Cesium3DTileStyle({
      color: {
        conditions: [
          ['${Elevation} >= 200', "color('#D33038')"], //red
          ['${Elevation} >= 150', "color('#2747E0')"], //blue
          ['${Elevation} >= 100', "color('#D33B7D')"], //pink
          ['${Elevation} >= 60', "color('#FF9742')"], //orange
          ['${Elevation} >= 30', 'rgba(252, 230, 200, 1)'],
          ['${Elevation} >= 20', 'rgba(248, 176, 87, 1)'],
          ['${Elevation} >= 10', 'rgba(198, 106, 11, 1)'],
          ['true', 'rgba(127, 59, 8, 1)']
        ]
      }
    })
  } else {
    map._removeCesium3DTileset(baimoLayers)
  }
}

// 显示隐藏精模
// 无锡
ZnvMap.showJingmoLayers = function (isShow) {
  if (jingmoLayers) {
    if (isShow) {
      jingmoLayers.visible = true
    } else {
      jingmoLayers.visible = false
    }
  } else {
    map._openSCP('http://218.94.111.14:20003/iserver/services/3D-wxjm_test/rest/realspace', (res) => {
      jingmoLayers = res[0]
    })
  }
}

// 显示隐藏卫星
// 无锡
ZnvMap.showWeixingLayers = function (isShow) {
  if (isShow) {
    weixingLayers = map._addWeixing()
  } else {
    map._removeWeixing(weixingLayers)
  }
}

// 加载事件动效
ZnvMap.loadEventCircle = function (opts) {
  opts.center = ZnvMap.zbTransform(opts.center)
  eventCircle = new ZMap.Circle(opts)
  eventCircle._addToMap()
  ZnvMap.showEventCircleContainMarker()
}

ZnvMap.changeEventCircleRadiu = function (r) {
  eventCircle._changeRadiu(r)
  ZnvMap.showEventCircleContainMarker()
}

ZnvMap.showEventCircleContainMarker = function () {
  let markers = []
  for (let key in layerMarks) {
    markers.push(layerMarks[key])
  }
  ZnvMap.hideAllMarkers()
  ZnvMap.showMarkers(eventCircle._contain(markers))
}

// 加载点位
ZnvMap.loadPointLayer = function (points, opts) {
  let defParams = {
    isHidden: false
  }
  defParams = Object.assign({}, defParams, opts)
  let markers = []
  points.forEach((e) => {
    if (!(e.position.lng && e.position.lat)) {
      // 坐标有问题定位到青岛市中心
      e.position.lng = 120.422167
      e.position.lat = 36.117018
      e.position.height = 5000
      // console.log('坐标有误', e)
      // return
    }
    let lnglat = ZnvMap.zbTransform(e.position)
    e.position.lng = lnglat[0]
    e.position.lat = lnglat[1]
    let marker = new ZMap.Marker(e)
    layerMarks[e.id] = marker
    if (!defParams.isHidden) {
      markers.push(marker)
    }
  })
  ZnvMap.showMarkers(markers)
}

ZnvMap.showMarkers = function (markers) {
  markerClusterLayer._addMarkers(markers)
  //   markers.forEach(e => {
  //     e._addToMap()
  //   })
}

ZnvMap.hideMarkers = function (markers) {
  markerClusterLayer._removeMarkers(markers)
  // markers.forEach(e => {
  //   e._removeFromMap()
  // })
}

ZnvMap.hideAllMarkers = function () {
  let markers = []
  for (let key in layerMarks) {
    markers.push(layerMarks[key])
  }
  ZnvMap.hideMarkers(markers)
}

ZnvMap.showMarkersByType = function (type) {
  let markers = []
  for (let key in layerMarks) {
    if (layerMarks[key].opts.extData.type === type) {
      markers.push(layerMarks[key])
    }
  }
  ZnvMap.showMarkers(markers)
}

ZnvMap.hideMarkersByType = function (type) {
  let markers = []
  for (let key in layerMarks) {
    if (layerMarks[key].opts.extData.type === type) {
      markers.push(layerMarks[key])
    }
  }
  ZnvMap.hideMarkers(markers)
}

ZnvMap.clickEvent = function (marker) {
  ZnvMap.showPointDetail(marker && marker.opts.extData)
}

ZnvMap.showPointDetail = function (info) {
  store.dispatch('map/setWindowInfoDetail', {
    data: info,
    random: new Date().getTime()
  })
}

ZnvMap.drawCircle = function () {
  if (!draw) {
    draw = new ZMap.Draw2D()
  }
  let markers = []
  for (let key in layerMarks) {
    markers.push(layerMarks[key])
  }
  draw._circleSelect(markers, (res) => {
    ZnvMap.hideAllMarkers()
    ZnvMap.showMarkers(res)
  })
}

ZnvMap.drawRectangle = function () {
  if (!draw) {
    draw = new ZMap.Draw2D()
  }
  let markers = []
  for (let key in layerMarks) {
    markers.push(layerMarks[key])
  }
  draw._rectangleSelect(markers, (res) => {
    ZnvMap.hideAllMarkers()
    ZnvMap.showMarkers(res)
  })
}

ZnvMap.drawPlane = function () {
  if (!draw) {
    draw = new ZMap.Draw2D()
  }
  let markers = []
  for (let key in layerMarks) {
    markers.push(layerMarks[key])
  }
  draw._planeSelect(markers, (res) => {
    ZnvMap.hideAllMarkers()
    ZnvMap.showMarkers(res)
  })
}

ZnvMap.drawClear = function () {
  if (draw) {
    draw.clear()
  }
}

ZnvMap.zbTransform = function (param, csysType = 4) {
  // 坐标转换
  let point
  if (param.length) {
    param.lng = param[0]
    param.lat = param[1]
  } else {
    param.lng = param.gpsX || param.gpsx || param.lng
    param.lat = param.gpsY || param.gpsy || param.lat
  }
  if (csysType === 1) {
    point = [parseFloat(param.lng), parseFloat(param.lat)]
  } else if (csysType === 4) {
    point = coordtransform.wgs84togcj02(parseFloat(param.lng), parseFloat(param.lat))
  } else if (csysType === 3) {
    point = coordtransform.gcj02towgs84(parseFloat(param.lng), parseFloat(param.lat))
  }
  return point
}

export default ZnvMap
