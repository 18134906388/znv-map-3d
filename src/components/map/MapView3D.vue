<template>
  <div class="map-view">
    <div class="znvmap" id="map-container"></div>
    <MapFilter />
    <el-slider
      @input="changeEventCircleRadiu"
      @change="showEventCircleContainMarker"
      v-model="eventRadiu"
      :max="10000"
      style="position: absolute; left: 40px; bottom: 20px; width: 300px"
    ></el-slider>
    <div class="opts-box">
      <div>
        <el-button type="primary" @click="drawCircle">画圆</el-button>
        <el-button type="primary" @click="drawRectangle">画长方形</el-button>
        <el-button type="primary" @click="drawPlane">画多边形</el-button>
        <el-button type="primary" @click="drawClear">清除</el-button>
      </div>
      <div>
        <el-button type="primary" @click="addWeixing">卫星</el-button>
        <el-button type="primary" @click="addBaimo">白模</el-button>
        <el-button type="primary" @click="addJingmo">精模</el-button>
      </div>
    </div>
  </div>
</template>

<script>
import ZnvMap from '@/components/map/znvMap-3d'
import { getIconByName } from './mapIcon'
import axios from '@/utils/request'
import MapFilter from './MapFilter'
// import moment from 'moment'
// import qs from 'qs'
export default {
  components: { MapFilter },
  data() {
    return {
      eventRadiu: 3000
    }
  },
  mounted() {
    setTimeout(() => {
      this.initMap()
    }, 1000)
  },
  watch: {
    '$store.getters.windowInfoDetail': {
      handler(v) {
        this.showWindowInfoDetail(v.data)
      }
    }
  },
  methods: {
    initMap() {
      // 初始化地图
      ZnvMap.start('map-container', {
        center: [120.422167, 36.117018, 5000]
      }).then(() => {
        // 加载事件点位
        this.loadEventPoints()
        // 加载点位
        this.loadMapPoints()
      })
    },
    loadEventPoints() {
      setTimeout(() => {
        this.loadEventCircle()
      }, 1000)
    },
    loadEventCircle() {
      ZnvMap.loadEventCircle({
        center: [120.422167, 36.117018],
        radiu: this.eventRadiu,
        height: 20
      })
    },
    changeEventCircleRadiu(v) {
      ZnvMap.changeEventCircleRadiu(v)
    },
    showEventCircleContainMarker() {
      ZnvMap.showEventCircleContainMarker()
    },
    loadMapPoints() {
      // 区委
      this.loadquweiPoint({ isHidden: false })
    },
    // 区委
    loadquweiPoint(opts) {
      axios.get('/mock/queryquwei.json').then((res) => {
        let pointList = this.quweiPointProcess(res.data.data)
        ZnvMap.loadPointLayer(pointList, opts)
      })
    },
    quweiPointProcess(data) {
      return data.map((e, index) => {
        let iconInfo = getIconByName(e.name)
        e.type = e.name
        let temp = {
          id: '区委_' + e.id,
          icon: iconInfo,
          title: e.name,
          position: { lng: e.gpsx, lat: e.gpsy, height: 100 },
          size: { width: 42, height: 48 },
          offset: { x: -21, y: -48 },
          extData: e
        }
        return temp
      })
    },
    showWindowInfoDetail(v) {
      console.log(v)
    },
    drawCircle() {
      ZnvMap.drawCircle()
    },
    drawRectangle() {
      ZnvMap.drawRectangle()
    },
    drawPlane() {
      ZnvMap.drawPlane()
    },
    drawClear() {
      ZnvMap.drawClear()
    },
    addWeixing() {
      this.isWeixing = !this.isWeixing
      if (this.isWeixing) {
        ZnvMap.showWeixingLayers(true)
      } else {
        ZnvMap.showWeixingLayers(false)
      }
    },
    addBaimo() {
      this.isBaimo = !this.isBaimo
      if (this.isBaimo) {
        ZnvMap.showBaimoLayers(true)
      } else {
        ZnvMap.showBaimoLayers(false)
      }
    },
    addJingmo() {
      this.isJingmo = !this.isJingmo
      if (this.isJingmo) {
        ZnvMap.showJingmoLayers(true)
      } else {
        ZnvMap.showJingmoLayers(false)
      }
    }
  }
}
</script>

<style lang="scss">
.map-view {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  flex-grow: 1;
  .znvmap {
    height: 100%;
    position: relative;
    background: #fff;
    .cesium-widget-credits {
      display: none;
    }
  }
  .opts-box{
    position: absolute;
    top: 20px;
    right: 20px;
  }
}
</style>
