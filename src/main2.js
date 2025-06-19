import "cesium/Build/Cesium/Widgets/widgets.css";
import { Ion, CallbackProperty, JulianDate, ArcType, Cartesian3 } from "cesium";
import * as OrbPro from "orbpro";

const {
  Viewer,
  SpaceEntity,
  viewerReferenceFrameMixin,
  Color,
  AccessReportGenerator
} = OrbPro;


Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkMWRkODI0Mi03MzIzLTQyNmUtYmI3OC0xNmMyMzgwZTNjMDMiLCJpZCI6NTcwMTcsImlhdCI6MTYyMTk2ODMyMn0.kq72xmk-d79pgx_P4e_mfYLzZ9DOC5pfVF5DrG7TMSg";

const ISS_OMM = {
  "OBJECT_NAME": "ISS (ZARYA)",
  "OBJECT_ID": "1998-067A",
  "EPOCH": "2024-05-23T08:20:49.756704",
  "MEAN_MOTION": 15.51759236,
  "ECCENTRICITY": 0.000331,
  "INCLINATION": 51.6388,
  "RA_OF_ASC_NODE": 78.4485,
  "ARG_OF_PERICENTER": 198.3472,
  "MEAN_ANOMALY": 306.6341,
  "BSTAR": 0.00040342,
  "MEAN_MOTION_DOT": 0.00024124,
  "MEAN_MOTION_DDOT": 0,
  "NORAD_CAT_ID": 25544
};

// Create a new const for a gnss satellite
const GPS_PRN10_OMM = {
    "OBJECT_NAME": "GPS BIIRM-3 (PRN 10)",
    "OBJECT_ID": "2007-047A",
    "EPOCH": "2024-05-23T00:00:00.000000",
    "MEAN_MOTION": 2.00567897,
    "ECCENTRICITY": 0.0106,
    "INCLINATION": 55.1,
    "RA_OF_ASC_NODE": 75.1,
    "ARG_OF_PERICENTER": 90.0,
    "MEAN_ANOMALY": 0.0,
    "BSTAR": 0.0001,
    "MEAN_MOTION_DOT": 0,
    "MEAN_MOTION_DDOT": 0,
    "NORAD_CAT_ID": 32260
};

window.onload = async () => {
    const viewer = new Viewer("cesiumContainer");
    viewer.extend(viewerReferenceFrameMixin);
    viewer.referenceFrame = 1;
  
    const ISS = new SpaceEntity({
      point: { pixelSize: 10, color: Color.RED }
    }, {});
    await ISS.loadOMM(ISS_OMM);
    viewer.entities.add(ISS);
    ISS.showOrbit({ show: true });
  
    const GPS_PRN10 = new SpaceEntity({
      point: { pixelSize: 10, color: Color.BLUE }
    }, {});
    await GPS_PRN10.loadOMM(GPS_PRN10_OMM);
    viewer.entities.add(GPS_PRN10);
    GPS_PRN10.showOrbit({ show: true });
  
    viewer.clock.currentTime = OrbPro.JulianDate.fromIso8601(ISS_OMM.EPOCH);
    viewer.clock.shouldAnimate = true;

    const hasLineOfSight = (pos1, pos2) => {
      if (!pos1 || !pos2) return false;

      const earthRadius = 6371000; // meters
      const earthRadiusSquared = earthRadius * earthRadius;

      const direction = Cartesian3.subtract(pos2, pos1, new Cartesian3());
      const originToCenter = Cartesian3.negate(pos1, new Cartesian3());

      const a = Cartesian3.dot(direction, direction);
      const b = 2.0 * Cartesian3.dot(direction, originToCenter);
      const c = Cartesian3.dot(originToCenter, originToCenter) - earthRadiusSquared;

      const discriminant = b * b - 4 * a * c;

      // If the line intersects the Earth (discriminant > 0), then there's no line of sight
      return discriminant <= 0;
    };

    // 👇 Line between satellites
    viewer.entities.add({
      polyline: {
        positions: new CallbackProperty(() => {
          const time = viewer.clock.currentTime;
          const pos1 = ISS.position.getValue(time);
          const pos2 = GPS_PRN10.position.getValue(time);

          if (!pos1 || !pos2) return null;

          return hasLineOfSight(pos1, pos2) ? [pos1, pos2] : null;
        }, false),
        width: 2,
        material: Color.YELLOW,
        arcType: ArcType.NONE // 👈 THIS makes it a straight line in 3D space
      }
    });
};