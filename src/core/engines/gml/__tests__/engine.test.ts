import { describe, expect, it } from "vitest";
import { convertGmlToGeoJson } from "../parser";

describe("GML Engine", () => {
	it("parses GML 2.x Point feature with coordinates and attributes", () => {
		const gml = `<?xml version="1.0" encoding="utf-8" ?>
<ogr:FeatureCollection
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xmlns:ogr="http://ogr.maptools.org/"
     xmlns:gml="http://www.opengis.net/gml">
  <gml:featureMember>
    <ogr:observation fid="obs.1">
      <ogr:geometryProperty>
        <gml:Point srsName="EPSG:4326">
          <gml:coordinates>12.4924,41.8902</gml:coordinates>
        </gml:Point>
      </ogr:geometryProperty>
      <ogr:NAME>Colosseum Station</ogr:NAME>
      <ogr:CAPACITY>50000</ogr:CAPACITY>
      <ogr:ACTIVE>true</ogr:ACTIVE>
    </ogr:observation>
  </gml:featureMember>
</ogr:FeatureCollection>`;

		const result = convertGmlToGeoJson(gml);
		expect(result.featureCount).toBe(1);
		expect(result.geometryTypes.Point).toBe(1);

		const feat = result.geoJson.features[0];
		expect(feat?.id).toBe("obs.1");
		expect(feat?.geometry?.type).toBe("Point");
		expect(feat?.geometry?.coordinates).toEqual([12.4924, 41.8902]);
		expect(feat?.properties.NAME).toBe("Colosseum Station");
		expect(feat?.properties.CAPACITY).toBe(50000);
		expect(feat?.properties.ACTIVE).toBe(true);
	});

	it("parses GML 3.x LineString with posList", () => {
		const gml = `<gml:FeatureCollection xmlns:gml="http://www.opengis.net/gml/3.2">
  <gml:featureMember>
    <gml:Feature gml:id="line_01">
      <gml:LineString srsDimension="2">
        <gml:posList>10.0 20.0 10.5 20.5 11.0 21.0</gml:posList>
      </gml:LineString>
      <gml:highway>primary</gml:highway>
    </gml:Feature>
  </gml:featureMember>
</gml:FeatureCollection>`;

		const result = convertGmlToGeoJson(gml);
		expect(result.featureCount).toBe(1);
		expect(result.geometryTypes.LineString).toBe(1);

		const feat = result.geoJson.features[0];
		expect(feat?.id).toBe("line_01");
		expect(feat?.geometry?.type).toBe("LineString");
		expect(feat?.geometry?.coordinates).toEqual([
			[10.0, 20.0],
			[10.5, 20.5],
			[11.0, 21.0],
		]);
		expect(feat?.properties.highway).toBe("primary");
	});

	it("parses GML 3.x Polygon with exterior ring and interior hole", () => {
		const gml = `<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs" xmlns:gml="http://www.opengis.net/gml">
  <gml:featureMember>
    <bldg:Building fid="bldg_42">
      <gml:Polygon>
        <gml:exterior>
          <gml:LinearRing>
            <gml:posList>0 0 10 0 10 10 0 10 0 0</gml:posList>
          </gml:LinearRing>
        </gml:exterior>
        <gml:interior>
          <gml:LinearRing>
            <gml:posList>2 2 8 2 8 8 2 8 2 2</gml:posList>
          </gml:LinearRing>
        </gml:interior>
      </gml:Polygon>
      <bldg:floors>4</bldg:floors>
    </bldg:Building>
  </gml:featureMember>
</wfs:FeatureCollection>`;

		const result = convertGmlToGeoJson(gml);
		expect(result.featureCount).toBe(1);
		expect(result.geometryTypes.Polygon).toBe(1);

		const feat = result.geoJson.features[0];
		expect(feat?.id).toBe("bldg_42");
		expect(feat?.geometry?.type).toBe("Polygon");
		const coords = feat?.geometry?.coordinates as number[][][];
		expect(coords.length).toBe(2); // Exterior + interior hole
		expect(coords[0]?.length).toBe(5);
		expect(coords[1]?.length).toBe(5);
		expect(feat?.properties.floors).toBe(4);
	});

	it("parses standalone GML geometry without featureMember", () => {
		const gml = `<gml:Point xmlns:gml="http://www.opengis.net/gml">
      <gml:pos>51.5074 -0.1278</gml:pos>
    </gml:Point>`;

		const result = convertGmlToGeoJson(gml);
		expect(result.featureCount).toBe(1);
		expect(result.geometryTypes.Point).toBe(1);
		expect(result.geoJson.features[0]?.geometry?.coordinates).toEqual([
			51.5074, -0.1278,
		]);
	});

	it("handles auto-detecting Lat/Lon axis order for EPSG:4326 with longitude > 90", () => {
		const gml = `<gml:FeatureCollection xmlns:gml="http://www.opengis.net/gml" srsName="urn:ogc:def:crs:EPSG::4326">
  <gml:featureMember>
    <app:Feature>
      <gml:Point>
        <gml:pos>35.6762 139.6503</gml:pos>
      </gml:Point>
      <app:city>Tokyo</app:city>
    </app:Feature>
  </gml:featureMember>
</gml:FeatureCollection>`;

		const result = convertGmlToGeoJson(gml, { autoDetectAxis: true });
		expect(result.featureCount).toBe(1);
		// Tokyo: Lat is 35.6762, Lon is 139.6503.
		// GeoJSON requires [lon, lat] = [139.6503, 35.6762]
		expect(result.geoJson.features[0]?.geometry?.coordinates).toEqual([
			139.6503, 35.6762,
		]);
	});

	it("throws on invalid non-XML input", () => {
		expect(() => convertGmlToGeoJson("Not XML at all")).toThrow(/Invalid GML/);
	});
});
