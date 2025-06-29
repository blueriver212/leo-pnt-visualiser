import "cesium/Build/Cesium/Widgets/widgets.css";
import { Ion, CallbackProperty, JulianDate, ArcType, Cartesian3 } from "cesium";
import * as OrbPro from "orbpro";
import { gpsOMMs } from "./GPS_sats.js";
import { galileoOMMs} from "./Galileo_sats.js";
import { glonassOMMs } from "./GLONASS_sats.js";

const {
  Viewer,
  SpaceEntity,
  viewerReferenceFrameMixin,
  Color,
  AccessReportGenerator
} = OrbPro;

Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkMWRkODI0Mi03MzIzLTQyNmUtYmI3OC0xNmMyMzgwZTNjMDMiLCJpZCI6NTcwMTcsImlhdCI6MTYyMTk2ODMyMn0.kq72xmk-d79pgx_P4e_mfYLzZ9DOC5pfVF5DrG7TMSg";

const OneWeb_Satellite = {
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

const earthRadius = 6371000; // meters
const earthRadiusSquared = earthRadius * earthRadius;

window.onload = async () => {
    const viewer = new Viewer("cesiumContainer");
    viewer.extend(viewerReferenceFrameMixin);
    viewer.referenceFrame = 1;

    viewer.clock.currentTime = OrbPro.JulianDate.fromIso8601(OneWeb_Satellite.EPOCH);
    viewer.clock.shouldAnimate = true;

    const hasLineOfSight = (pos1, pos2) => {
      if (!pos1 || !pos2) return false;
      const direction = Cartesian3.subtract(pos2, pos1, new Cartesian3());
      const originToCenter = Cartesian3.negate(pos1, new Cartesian3());
      const a = Cartesian3.dot(direction, direction);
      const b = 2.0 * Cartesian3.dot(direction, originToCenter);
      const c = Cartesian3.dot(originToCenter, originToCenter) - earthRadiusSquared;
      const discriminant = b * b - 4 * a * c;
      // If the line intersects the Earth (discriminant > 0), then there's no line of sight
      return discriminant <= 0;
    };

    const ISS = new SpaceEntity({
      point: { pixelSize: 10, color: Color.RED }
    }, {});
    await ISS.loadOMM(OneWeb_Satellite);
    viewer.entities.add(ISS);
    ISS.showOrbit({ show: true });

    
    async function addSatelliteGroup(ommArray, gnssType, gnssColour) {
      const sats = [];

        for (const omm of ommArray) {
          const satEntity = new SpaceEntity(
            { point: { pixelSize: 6, color: gnssColour } },
            {}
          );
          await satEntity.loadOMM(omm);
          viewer.entities.add(satEntity);

          sats.push({
            entity: satEntity,
            name: omm.OBJECT_NAME
          });
        }

        return sats;
      }

    function createGnssLines(satDataArray, lineColour) {
      return satDataArray.map(({ entity: satEntity }) => {
        const lineEntity = viewer.entities.add({
          polyline: {
            positions: new CallbackProperty(() => {
              const time   = viewer.clock.currentTime;
              const issPos = ISS.position.getValue(time);
              const satPos = satEntity.position.getValue(time);
              if (!issPos || !satPos) return null;
              return hasLineOfSight(issPos, satPos)
                ? [issPos, satPos]
                : null;
            }, false),
            width:    1.5,
            material: lineColour,
            arcType:  ArcType.NONE
          }
        });
        return { sat: satEntity, line: lineEntity };
      });
    }

    const gpsSatsData     = await addSatelliteGroup(gpsOMMs,     'GPS',     Color.BLUE);
    const galileoSatsData = await addSatelliteGroup(galileoOMMs, 'Galileo', Color.GREEN);
    const glonassSatsData = await addSatelliteGroup(glonassOMMs, 'GLONASS',Color.PEACHPUFF);

    const gpsSatsLines     = createGnssLines(gpsSatsData,     Color.YELLOW);
    const galileoSatsLines = createGnssLines(galileoSatsData, Color.PURPLE);
    const glonassSatsLines = createGnssLines(glonassSatsData, Color.AQUA);

    const allGnssSats = [
      ...gpsSatsData,
      ...galileoSatsData,
      ...glonassSatsData
    ];


  // grab the <tbody> once
  const tbody = document.getElementById('visibilityTable').querySelector('tbody');

  // on each clock tick, rebuild the list of visible sats
  viewer.clock.onTick.addEventListener((clock) => {
    const time   = clock.currentTime;
    const issPos = ISS.position.getValue(time);
    if (!issPos) return;

    // figure out which sats are in LOS
    const visibleNames = allGnssSats
      .filter(({ entity }) => {
        const satPos = entity.position.getValue(time);
        return satPos && hasLineOfSight(issPos, satPos);
      })
      .map(({ name }) => name);

    // clear & repopulate the table
    tbody.innerHTML = '';
    for (const name of visibleNames) {
      const row  = document.createElement('tr');
      const cell = document.createElement('td');
      cell.textContent = name;
      row.appendChild(cell);
      tbody.appendChild(row);
    }
  });

  document.getElementById('toggle-gps').addEventListener('change', (e) => {
    gpsSatsData.forEach(({ entity }) => entity.show = e.target.checked);
    gpsSatsLines.forEach(({ line })   => line.polyline.show = e.target.checked);
  });

  document.getElementById('toggle-galileo').addEventListener('change', (e) => {
      galileoSatsData.forEach(({ entity }) => entity.show = e.target.checked);
      galileoSatsLines.forEach(({ line }) => line.polyline.show = e.target.checked);
  });

  document.getElementById('toggle-glonass').addEventListener('change', (e) => {
      glonassSatsData.forEach(({ entity }) => entity.show = e.target.checked);
      glonassSatsLines.forEach(({ line }) => line.polyline.show = e.target.checked);
  });

  

    //   console.log("GPS Satellites and Lines:");
    // gpsSats.forEach((obj, i) => {
    //   console.log(`GPS #${i}:`, { sat: obj.sat, line: obj.line });
    // });

    // console.log("Galileo Satellites and Lines:");
    // galileoSats.forEach((obj, i) => {
    //   console.log(`Galileo #${i}:`, { sat: obj.sat, line: obj.line });
    // });

    // console.log("GLONASS Satellites and Lines:");
    // glonassSats.forEach((obj, i) => {
    //   console.log(`GLONASS #${i}:`, { sat: obj.sat, line: obj.line });
    // });

  };