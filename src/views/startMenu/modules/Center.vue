<template>
  <div class="Center">
    <MapView3D />
  </div>
</template>

<script>
// import MapView from '@/components/map/MapView'
import MapView3D from '@/components/map/MapView3D'
export default {
  components: {
    MapView3D
  },
  data () {
    return {
      reservoirList: []
    }
  }
}
</script>

<style lang="scss">
.Center {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}
</style>
