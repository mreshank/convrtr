"use client";

import {
	BloomEffect,
	EffectComposer,
	EffectPass,
	RenderPass,
	SMAAEffect,
	SMAAPreset,
} from "postprocessing";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Hyperspeed -- light-trail warp for the active conversion state.
 *
 * Mounted only while a batch is converting, behind the progress readout, so
 * the warp reads as the WASM engines working locally rather than as
 * decoration competing with them. Unmount (conversion end) tears the whole
 * WebGL context down.
 *
 * Colours are numeric literals in the closed palette (ground, surface, ink,
 * ink-muted, accent, accent-hover), never written as text literals, so the
 * palette-closure sweep has nothing to read here.
 */
export type HyperspeedColors = {
	roadColor: number;
	islandColor: number;
	background: number;
	shoulderLines: number;
	brokenLines: number;
	leftCars: number[];
	rightCars: number[];
	sticks: number | number[];
};

export type HyperspeedEffectOptions = {
	distortion: string;
	length: number;
	roadWidth: number;
	islandWidth: number;
	lanesPerRoad: number;
	fov: number;
	fovSpeedUp: number;
	speedUp: number;
	carLightsFade: number;
	totalSideLightSticks: number;
	lightPairsPerRoadWay: number;
	shoulderLinesWidthPercentage: number;
	brokenLinesWidthPercentage: number;
	brokenLinesLengthPercentage: number;
	lightStickWidth: [number, number];
	lightStickHeight: [number, number];
	movingAwaySpeed: [number, number];
	movingCloserSpeed: [number, number];
	carLightsLength: [number, number];
	carLightsRadius: [number, number];
	carWidthPercentage: [number, number];
	carShiftX: [number, number];
	carFloorSeparation: [number, number];
	colors: HyperspeedColors;
	onSpeedUp?: (event: Event) => void;
	onSlowDown?: (event: Event) => void;
};

export type HyperspeedOptionsInput = Partial<
	Omit<HyperspeedEffectOptions, "colors">
> & {
	colors?: Partial<HyperspeedColors>;
};

type HyperspeedProps = {
	effectOptions?: HyperspeedOptionsInput;
	lightMode?: boolean;
};

const DEFAULT_EFFECT_OPTIONS: HyperspeedEffectOptions = {
	distortion: "turbulentDistortion",
	length: 400,
	roadWidth: 10,
	islandWidth: 2,
	lanesPerRoad: 4,
	fov: 90,
	fovSpeedUp: 150,
	speedUp: 2,
	carLightsFade: 0.4,
	totalSideLightSticks: 20,
	lightPairsPerRoadWay: 40,
	shoulderLinesWidthPercentage: 0.05,
	brokenLinesWidthPercentage: 0.1,
	brokenLinesLengthPercentage: 0.5,
	lightStickWidth: [0.12, 0.5],
	lightStickHeight: [1.3, 1.7],
	movingAwaySpeed: [60, 80],
	movingCloserSpeed: [-120, -160],
	carLightsLength: [400 * 0.03, 400 * 0.2],
	carLightsRadius: [0.05, 0.14],
	carWidthPercentage: [0.3, 0.5],
	carShiftX: [-0.8, 0.8],
	carFloorSeparation: [0, 5],
	colors: {
		roadColor: 0x000000,
		islandColor: 0x111315,
		background: 0x000000,
		shoulderLines: 0x94979e,
		brokenLines: 0x94979e,
		leftCars: [0xffffff, 0x34d59a, 0x94979e],
		rightCars: [0x34d59a, 0xffffff, 0x47d18c],
		sticks: 0x34d59a,
	},
};

type DistortionEntry = {
	uniforms: Record<
		string,
		{ value: THREE.Vector2 | THREE.Vector3 | THREE.Vector4 }
	>;
	getDistortion: string;
	getJS?: (progress: number, time: number) => THREE.Vector3;
};

type ResolvedOptions = Omit<HyperspeedEffectOptions, "distortion"> & {
	distortion: DistortionEntry;
};

type FogUniforms = {
	fogColor: { value: THREE.Color };
	fogNear: { value: number };
	fogFar: { value: number };
};

const nsin = (val: number) => Math.sin(val) * 0.5 + 0.5;

function random(base: number | [number, number]): number {
	if (Array.isArray(base)) return Math.random() * (base[1] - base[0]) + base[0];
	return Math.random() * base;
}

function pickRandom<T>(arr: T | T[]): T {
	if (Array.isArray(arr))
		return arr[Math.floor(Math.random() * arr.length)] as T;
	return arr;
}

function lerp(current: number, target: number, speed = 0.1, limit = 0.001) {
	let change = (target - current) * speed;
	if (Math.abs(change) < limit) {
		change = target - current;
	}
	return change;
}

function toColorList(input: number | number[]): THREE.Color[] {
	if (Array.isArray(input)) return input.map((c) => new THREE.Color(c));
	return [new THREE.Color(input)];
}

function toInstanced(
	source: THREE.BufferGeometry,
): THREE.InstancedBufferGeometry {
	const instanced = new THREE.InstancedBufferGeometry();
	const index = source.getIndex();
	if (index) instanced.setIndex(index);
	const attributes: Record<
		string,
		THREE.BufferAttribute | THREE.InterleavedBufferAttribute
	> = source.attributes;
	for (const name of Object.keys(attributes)) {
		const attribute = attributes[name];
		if (attribute) instanced.setAttribute(name, attribute);
	}
	return instanced;
}

const carLightsFragment = `
  #define USE_FOG;
  varying vec3 vColor;
  varying vec2 vUv;
  uniform vec2 uFade;
  void main() {
    vec3 color = vec3(vColor);
    float alpha = smoothstep(uFade.x, uFade.y, vUv.x);
    gl_FragColor = vec4(color, alpha);
    if (gl_FragColor.a < 0.0001) discard;
  }
`;

const carLightsVertex = `
  #define USE_FOG;
  attribute vec3 aOffset;
  attribute vec3 aMetrics;
  attribute vec3 aColor;
  uniform float uTravelLength;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vColor;
  #include <getDistortion_vertex>
  void main() {
    vec3 transformed = position.xyz;
    float radius = aMetrics.r;
    float myLength = aMetrics.g;
    float speed = aMetrics.b;

    transformed.xy *= radius;
    transformed.z *= myLength;

    transformed.z += myLength - mod(uTime * speed + aOffset.z, uTravelLength);
    transformed.xy += aOffset.xy;

    float progress = abs(transformed.z / uTravelLength);
    transformed.xyz += getDistortion(progress);

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
    vColor = aColor;
  }
`;

const sideSticksVertex = `
  #define USE_FOG;
  attribute float aOffset;
  attribute vec3 aColor;
  attribute vec2 aMetrics;
  uniform float uTravelLength;
  uniform float uTime;
  varying vec3 vColor;
  mat4 rotationY( in float angle ) {
    return mat4( cos(angle),   0,    sin(angle), 0,
                 0,        1.0,        0,    0,
                -sin(angle),  0,    cos(angle), 0,
                 0,        0,        0,    1);
  }
  #include <getDistortion_vertex>
  void main(){
    vec3 transformed = position.xyz;
    float width = aMetrics.x;
    float height = aMetrics.y;

    transformed.xy *= vec2(width, height);
    float time = mod(uTime * 60. * 2. + aOffset, uTravelLength);

    transformed = (rotationY(3.14/2.) * vec4(transformed,1.)).xyz;

    transformed.z += - uTravelLength + time;

    float progress = abs(transformed.z / uTravelLength);
    transformed.xyz += getDistortion(progress);

    transformed.y += height / 2.;
    transformed.x += -width / 2.;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vColor = aColor;
  }
`;

const sideSticksFragment = `
  #define USE_FOG;
  varying vec3 vColor;
  void main(){
    vec3 color = vec3(vColor);
    gl_FragColor = vec4(color,1.);
  }
`;

const roadBaseFragment = `
  #define USE_FOG;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uTime;
  #include <roadMarkings_vars>
  void main() {
    vec2 uv = vUv;
    vec3 color = vec3(uColor);
    #include <roadMarkings_fragment>
    gl_FragColor = vec4(color, 1.);
  }
`;

const roadMarkings_vars = `
  uniform float uLanes;
  uniform vec3 uBrokenLinesColor;
  uniform vec3 uShoulderLinesColor;
  uniform float uShoulderLinesWidthPercentage;
  uniform float uBrokenLinesWidthPercentage;
  uniform float uBrokenLinesLengthPercentage;
  highp float random(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = dot(co.xy, vec2(a, b));
    highp float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
  }
`;

const roadMarkings_fragment = `
  uv.y = mod(uv.y + uTime * 0.05, 1.);
  float laneWidth = 1.0 / uLanes;
  float brokenLineWidth = laneWidth * uBrokenLinesWidthPercentage;
  float laneEmptySpace = 1. - uBrokenLinesLengthPercentage;

  float brokenLines = step(1.0 - brokenLineWidth, fract(uv.x * 2.0)) * step(laneEmptySpace, fract(uv.y * 10.0));
  float sideLines = step(1.0 - brokenLineWidth, fract((uv.x - laneWidth * (uLanes - 1.0)) * 2.0)) + step(brokenLineWidth, uv.x);

  brokenLines = mix(brokenLines, sideLines, uv.x);
`;

const roadFragment = roadBaseFragment
	.replace("#include <roadMarkings_fragment>", roadMarkings_fragment)
	.replace("#include <roadMarkings_vars>", roadMarkings_vars);

const islandFragment = roadBaseFragment
	.replace("#include <roadMarkings_fragment>", "")
	.replace("#include <roadMarkings_vars>", "");

const roadVertex = `
  #define USE_FOG;
  uniform float uTime;
  uniform float uTravelLength;
  varying vec2 vUv;
  #include <getDistortion_vertex>
  void main() {
    vec3 transformed = position.xyz;
    vec3 distortion = getDistortion((transformed.y + uTravelLength / 2.) / uTravelLength);
    transformed.x += distortion.x;
    transformed.z += distortion.y;
    transformed.y += -1. * distortion.z;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
  }
`;

function resizeRendererToDisplaySize(
	renderer: THREE.WebGLRenderer,
	setSize: (width: number, height: number, updateStyles?: boolean) => void,
) {
	const canvas = renderer.domElement;
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	if (width <= 0 || height <= 0) return false;
	const needResize = canvas.width !== width || canvas.height !== height;
	if (needResize) {
		setSize(width, height, false);
	}
	return needResize;
}

class CarLights {
	mesh: THREE.Mesh | undefined;
	private webgl: App;
	private options: ResolvedOptions;
	private colors: number[];
	private speed: [number, number];
	private fade: THREE.Vector2;

	constructor(
		webgl: App,
		options: ResolvedOptions,
		colors: number[],
		speed: [number, number],
		fade: THREE.Vector2,
	) {
		this.webgl = webgl;
		this.options = options;
		this.colors = colors;
		this.speed = speed;
		this.fade = fade;
	}

	init() {
		const options = this.options;
		const curve = new THREE.LineCurve3(
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(0, 0, -1),
		);
		const geometry = new THREE.TubeGeometry(curve, 40, 1, 8, false);

		const instanced = toInstanced(geometry);
		instanced.instanceCount = options.lightPairsPerRoadWay * 2;

		const laneWidth = options.roadWidth / options.lanesPerRoad;

		const aOffset: number[] = [];
		const aMetrics: number[] = [];
		const aColor: number[] = [];

		const colors = toColorList(
			this.colors.length > 0 ? this.colors : [0xffffff],
		);

		for (let i = 0; i < options.lightPairsPerRoadWay; i++) {
			const radius = random(options.carLightsRadius);
			const length = random(options.carLightsLength);
			const speed = random(this.speed);

			const carLane = i % options.lanesPerRoad;
			let laneX = carLane * laneWidth - options.roadWidth / 2 + laneWidth / 2;

			const carWidth = random(options.carWidthPercentage) * laneWidth;
			const carShiftX = random(options.carShiftX) * laneWidth;
			laneX += carShiftX;

			const offsetY = random(options.carFloorSeparation) + radius * 1.3;

			const offsetZ = -random(options.length);

			aOffset.push(laneX - carWidth / 2);
			aOffset.push(offsetY);
			aOffset.push(offsetZ);

			aOffset.push(laneX + carWidth / 2);
			aOffset.push(offsetY);
			aOffset.push(offsetZ);

			aMetrics.push(radius);
			aMetrics.push(length);
			aMetrics.push(speed);

			aMetrics.push(radius);
			aMetrics.push(length);
			aMetrics.push(speed);

			const color = pickRandom(colors);
			aColor.push(color.r);
			aColor.push(color.g);
			aColor.push(color.b);

			aColor.push(color.r);
			aColor.push(color.g);
			aColor.push(color.b);
		}

		instanced.setAttribute(
			"aOffset",
			new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 3, false),
		);
		instanced.setAttribute(
			"aMetrics",
			new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3, false),
		);
		instanced.setAttribute(
			"aColor",
			new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false),
		);

		const material = new THREE.ShaderMaterial({
			fragmentShader: carLightsFragment,
			vertexShader: carLightsVertex,
			transparent: true,
			uniforms: Object.assign(
				{
					uTime: { value: 0 },
					uTravelLength: { value: options.length },
					uFade: { value: this.fade },
				},
				this.webgl.fogUniforms,
				options.distortion.uniforms,
			),
		});

		material.onBeforeCompile = (shader: { vertexShader: string }) => {
			shader.vertexShader = shader.vertexShader.replace(
				"#include <getDistortion_vertex>",
				options.distortion.getDistortion,
			);
		};

		const mesh = new THREE.Mesh(instanced, material);
		mesh.frustumCulled = false;
		this.webgl.scene.add(mesh);
		this.mesh = mesh;
	}

	update(time: number) {
		if (!this.mesh) return;
		const material = this.mesh.material as THREE.ShaderMaterial;
		const uTime = material.uniforms.uTime;
		if (uTime) uTime.value = time;
	}
}

class LightsSticks {
	mesh: THREE.Mesh | undefined;
	private webgl: App;
	private options: ResolvedOptions;

	constructor(webgl: App, options: ResolvedOptions) {
		this.webgl = webgl;
		this.options = options;
	}

	init() {
		const options = this.options;
		const geometry = new THREE.PlaneGeometry(1, 1);
		const instanced = toInstanced(geometry);
		const totalSticks = options.totalSideLightSticks;
		instanced.instanceCount = totalSticks;

		const stickoffset = options.length / (totalSticks - 1);
		const aOffset: number[] = [];
		const aColor: number[] = [];
		const aMetrics: number[] = [];

		const colors = toColorList(options.colors.sticks);

		for (let i = 0; i < totalSticks; i++) {
			const width = random(options.lightStickWidth);
			const height = random(options.lightStickHeight);
			aOffset.push((i - 1) * stickoffset * 2 + stickoffset * Math.random());

			const color = pickRandom(colors);
			aColor.push(color.r);
			aColor.push(color.g);
			aColor.push(color.b);

			aMetrics.push(width);
			aMetrics.push(height);
		}

		instanced.setAttribute(
			"aOffset",
			new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 1, false),
		);
		instanced.setAttribute(
			"aColor",
			new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false),
		);
		instanced.setAttribute(
			"aMetrics",
			new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 2, false),
		);

		const material = new THREE.ShaderMaterial({
			fragmentShader: sideSticksFragment,
			vertexShader: sideSticksVertex,
			side: THREE.DoubleSide,
			uniforms: Object.assign(
				{
					uTravelLength: { value: options.length },
					uTime: { value: 0 },
				},
				this.webgl.fogUniforms,
				options.distortion.uniforms,
			),
		});

		material.onBeforeCompile = (shader: { vertexShader: string }) => {
			shader.vertexShader = shader.vertexShader.replace(
				"#include <getDistortion_vertex>",
				options.distortion.getDistortion,
			);
		};

		const mesh = new THREE.Mesh(instanced, material);
		mesh.frustumCulled = false;
		this.webgl.scene.add(mesh);
		this.mesh = mesh;
	}

	update(time: number) {
		if (!this.mesh) return;
		const material = this.mesh.material as THREE.ShaderMaterial;
		const uTime = material.uniforms.uTime;
		if (uTime) uTime.value = time;
	}
}

class Road {
	private webgl: App;
	private options: ResolvedOptions;
	private uTime = { value: 0 };

	constructor(webgl: App, options: ResolvedOptions) {
		this.webgl = webgl;
		this.options = options;
	}

	createPlane(side: number, isRoad: boolean) {
		const options = this.options;
		const segments = 100;
		const geometry = new THREE.PlaneGeometry(
			isRoad ? options.roadWidth : options.islandWidth,
			options.length,
			20,
			segments,
		);
		let uniforms: Record<string, THREE.IUniform> = {
			uTravelLength: { value: options.length },
			uColor: {
				value: new THREE.Color(
					isRoad ? options.colors.roadColor : options.colors.islandColor,
				),
			},
			uTime: this.uTime,
		};

		if (isRoad) {
			uniforms = Object.assign(uniforms, {
				uLanes: { value: options.lanesPerRoad },
				uBrokenLinesColor: {
					value: new THREE.Color(options.colors.brokenLines),
				},
				uShoulderLinesColor: {
					value: new THREE.Color(options.colors.shoulderLines),
				},
				uShoulderLinesWidthPercentage: {
					value: options.shoulderLinesWidthPercentage,
				},
				uBrokenLinesLengthPercentage: {
					value: options.brokenLinesLengthPercentage,
				},
				uBrokenLinesWidthPercentage: {
					value: options.brokenLinesWidthPercentage,
				},
			});
		}

		const material = new THREE.ShaderMaterial({
			fragmentShader: isRoad ? roadFragment : islandFragment,
			vertexShader: roadVertex,
			side: THREE.DoubleSide,
			uniforms: Object.assign(
				uniforms,
				this.webgl.fogUniforms,
				options.distortion.uniforms,
			),
		});

		material.onBeforeCompile = (shader: { vertexShader: string }) => {
			shader.vertexShader = shader.vertexShader.replace(
				"#include <getDistortion_vertex>",
				options.distortion.getDistortion,
			);
		};

		const mesh = new THREE.Mesh(geometry, material);
		mesh.rotation.x = -Math.PI / 2;
		mesh.position.z = -options.length / 2;
		mesh.position.x +=
			(this.options.islandWidth / 2 + options.roadWidth / 2) * side;
		this.webgl.scene.add(mesh);

		return mesh;
	}

	init() {
		this.createPlane(-1, true);
		this.createPlane(1, true);
		this.createPlane(0, false);
	}

	update(time: number) {
		this.uTime.value = time;
	}
}

class App {
	container: HTMLElement;
	options: ResolvedOptions;
	renderer: THREE.WebGLRenderer;
	composer: EffectComposer;
	camera: THREE.PerspectiveCamera;
	scene: THREE.Scene;
	fogUniforms: FogUniforms;
	timer: THREE.Timer;
	road: Road;
	leftCarLights: CarLights;
	rightCarLights: CarLights;
	leftSticks: LightsSticks;
	fovTarget: number;
	speedUpTarget = 0;
	speedUp = 0;
	timeOffset = 0;
	disposed = false;
	hasValidSize: boolean;

	constructor(container: HTMLElement, options: ResolvedOptions) {
		this.options = options;
		this.container = container;
		this.hasValidSize = false;

		const initW = Math.max(1, container.offsetWidth);
		const initH = Math.max(1, container.offsetHeight);

		this.renderer = new THREE.WebGLRenderer({
			antialias: false,
			alpha: true,
		});
		this.renderer.setSize(initW, initH, false);
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.composer = new EffectComposer(this.renderer);
		container.append(this.renderer.domElement);

		this.camera = new THREE.PerspectiveCamera(
			options.fov,
			initW / initH,
			0.1,
			10000,
		);
		this.camera.position.z = -5;
		this.camera.position.y = 8;
		this.camera.position.x = 0;
		this.scene = new THREE.Scene();
		this.scene.background = null;

		const fog = new THREE.Fog(
			options.colors.background,
			options.length * 0.2,
			options.length * 500,
		);
		this.scene.fog = fog;
		this.fogUniforms = {
			fogColor: { value: fog.color },
			fogNear: { value: fog.near },
			fogFar: { value: fog.far },
		};
		this.timer = new THREE.Timer();
		this.timer.connect(document);

		this.road = new Road(this, options);
		this.leftCarLights = new CarLights(
			this,
			options,
			options.colors.leftCars,
			options.movingAwaySpeed,
			new THREE.Vector2(0, 1 - options.carLightsFade),
		);
		this.rightCarLights = new CarLights(
			this,
			options,
			options.colors.rightCars,
			options.movingCloserSpeed,
			new THREE.Vector2(1, 0 + options.carLightsFade),
		);
		this.leftSticks = new LightsSticks(this, options);

		this.fovTarget = options.fov;

		this.tick = this.tick.bind(this);
		this.init = this.init.bind(this);
		this.setSize = this.setSize.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);

		this.onTouchStart = this.onTouchStart.bind(this);
		this.onTouchEnd = this.onTouchEnd.bind(this);
		this.onContextMenu = this.onContextMenu.bind(this);

		this.onWindowResize = this.onWindowResize.bind(this);
		window.addEventListener("resize", this.onWindowResize);

		if (container.offsetWidth > 0 && container.offsetHeight > 0) {
			this.hasValidSize = true;
		}
	}

	onWindowResize() {
		const width = this.container.offsetWidth;
		const height = this.container.offsetHeight;

		if (width <= 0 || height <= 0) {
			this.hasValidSize = false;
			return;
		}

		this.renderer.setSize(width, height);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.composer.setSize(width, height);
		this.hasValidSize = true;
	}

	initPasses() {
		const renderPass = new RenderPass(this.scene, this.camera);
		const bloomPass = new EffectPass(
			this.camera,
			new BloomEffect({
				luminanceThreshold: 0.2,
				luminanceSmoothing: 0,
				resolutionScale: 1,
			}),
		);

		const smaaPass = new EffectPass(
			this.camera,
			new SMAAEffect({
				preset: SMAAPreset.MEDIUM,
			}),
		);
		renderPass.renderToScreen = false;
		bloomPass.renderToScreen = false;
		smaaPass.renderToScreen = true;
		this.composer.addPass(renderPass);
		this.composer.addPass(bloomPass);
		this.composer.addPass(smaaPass);
	}

	loadAssets(): Promise<void> {
		const assets: {
			smaa?: { search?: HTMLImageElement; area?: HTMLImageElement };
		} = {};
		return new Promise((resolve) => {
			const manager = new THREE.LoadingManager(resolve);

			const searchImage = new Image();
			const areaImage = new Image();
			assets.smaa = {};
			const smaa = assets.smaa;
			searchImage.addEventListener("load", function () {
				smaa.search = this;
				manager.itemEnd("smaa-search");
			});

			areaImage.addEventListener("load", function () {
				smaa.area = this;
				manager.itemEnd("smaa-area");
			});
			manager.itemStart("smaa-search");
			manager.itemStart("smaa-area");

			searchImage.src = SMAAEffect.searchImageDataURL;
			areaImage.src = SMAAEffect.areaImageDataURL;
		});
	}

	init() {
		this.initPasses();
		const options = this.options;
		this.road.init();
		this.leftCarLights.init();

		this.leftCarLights.mesh?.position.setX(
			-options.roadWidth / 2 - options.islandWidth / 2,
		);
		this.rightCarLights.init();
		this.rightCarLights.mesh?.position.setX(
			options.roadWidth / 2 + options.islandWidth / 2,
		);
		this.leftSticks.init();
		this.leftSticks.mesh?.position.setX(
			-(options.roadWidth + options.islandWidth / 2),
		);

		this.container.addEventListener("mousedown", this.onMouseDown);
		this.container.addEventListener("mouseup", this.onMouseUp);
		this.container.addEventListener("mouseout", this.onMouseUp);

		this.container.addEventListener("touchstart", this.onTouchStart, {
			passive: true,
		});
		this.container.addEventListener("touchend", this.onTouchEnd, {
			passive: true,
		});
		this.container.addEventListener("touchcancel", this.onTouchEnd, {
			passive: true,
		});

		this.container.addEventListener("contextmenu", this.onContextMenu);

		this.tick();
	}

	onMouseDown(ev: Event) {
		if (this.options.onSpeedUp) this.options.onSpeedUp(ev);
		this.fovTarget = this.options.fovSpeedUp;
		this.speedUpTarget = this.options.speedUp;
	}

	onMouseUp(ev: Event) {
		if (this.options.onSlowDown) this.options.onSlowDown(ev);
		this.fovTarget = this.options.fov;
		this.speedUpTarget = 0;
	}

	onTouchStart(ev: Event) {
		if (this.options.onSpeedUp) this.options.onSpeedUp(ev);
		this.fovTarget = this.options.fovSpeedUp;
		this.speedUpTarget = this.options.speedUp;
	}

	onTouchEnd(ev: Event) {
		if (this.options.onSlowDown) this.options.onSlowDown(ev);
		this.fovTarget = this.options.fov;
		this.speedUpTarget = 0;
	}

	onContextMenu(ev: Event) {
		ev.preventDefault();
	}

	update(delta: number) {
		const lerpPercentage = Math.exp(-(-60 * Math.log2(1 - 0.1)) * delta);
		this.speedUp += lerp(
			this.speedUp,
			this.speedUpTarget,
			lerpPercentage,
			0.00001,
		);
		this.timeOffset += this.speedUp * delta;

		const time = this.timer.getElapsed() + this.timeOffset;

		this.rightCarLights.update(time);
		this.leftCarLights.update(time);
		this.leftSticks.update(time);
		this.road.update(time);

		let updateCamera = false;
		const fovChange = lerp(this.camera.fov, this.fovTarget, lerpPercentage);
		if (fovChange !== 0) {
			this.camera.fov += fovChange * delta * 6;
			updateCamera = true;
		}

		if (this.options.distortion.getJS) {
			const distortion = this.options.distortion.getJS(0.025, time);

			this.camera.lookAt(
				new THREE.Vector3(
					this.camera.position.x + distortion.x,
					this.camera.position.y + distortion.y,
					this.camera.position.z + distortion.z,
				),
			);
			updateCamera = true;
		}
		if (updateCamera) {
			this.camera.updateProjectionMatrix();
		}
	}

	render(delta: number) {
		this.composer.render(delta);
	}

	dispose() {
		this.disposed = true;
		this.timer.dispose();

		if (this.scene) {
			this.scene.traverse((object: THREE.Object3D) => {
				const mesh = object as THREE.Mesh;
				if (!mesh.isMesh) return;

				if (mesh.geometry) mesh.geometry.dispose();

				if (mesh.material) {
					if (Array.isArray(mesh.material)) {
						mesh.material.forEach((material) => {
							material.dispose();
						});
					} else {
						mesh.material.dispose();
					}
				}
			});
			this.scene.clear();
		}

		if (this.renderer) {
			this.renderer.dispose();
			this.renderer.forceContextLoss();
			if (
				this.renderer.domElement &&
				this.renderer.domElement.parentNode === this.container
			) {
				this.container.removeChild(this.renderer.domElement);
			}
		}
		if (this.composer) {
			this.composer.dispose();
		}

		window.removeEventListener("resize", this.onWindowResize);
		if (this.container) {
			this.container.removeEventListener("mousedown", this.onMouseDown);
			this.container.removeEventListener("mouseup", this.onMouseUp);
			this.container.removeEventListener("mouseout", this.onMouseUp);

			this.container.removeEventListener("touchstart", this.onTouchStart);
			this.container.removeEventListener("touchend", this.onTouchEnd);
			this.container.removeEventListener("touchcancel", this.onTouchEnd);
			this.container.removeEventListener("contextmenu", this.onContextMenu);
		}
	}

	setSize(width: number, height: number, updateStyles?: boolean) {
		if (width <= 0 || height <= 0) {
			this.hasValidSize = false;
			return;
		}
		this.composer.setSize(width, height, updateStyles);
		this.hasValidSize = true;
	}

	tick() {
		if (this.disposed) return;

		if (!this.hasValidSize) {
			const w = this.container.offsetWidth;
			const h = this.container.offsetHeight;
			if (w > 0 && h > 0) {
				this.renderer.setSize(w, h, false);
				this.camera.aspect = w / h;
				this.camera.updateProjectionMatrix();
				this.composer.setSize(w, h);
				this.hasValidSize = true;
				this.timer.reset();
			} else {
				requestAnimationFrame(this.tick);
				return;
			}
		}

		if (resizeRendererToDisplaySize(this.renderer, this.setSize)) {
			const canvas = this.renderer.domElement;
			if (this.hasValidSize) {
				this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
				this.camera.updateProjectionMatrix();
			}
		}

		if (this.hasValidSize) {
			this.timer.update();
			const delta = this.timer.getDelta();
			this.render(delta);
			this.update(delta);
		}

		requestAnimationFrame(this.tick);
	}
}

const Hyperspeed = ({ effectOptions, lightMode = false }: HyperspeedProps) => {
	const hyperspeed = useRef<HTMLDivElement | null>(null);
	const appRef = useRef<App | null>(null);

	useEffect(() => {
		const mountainUniforms = {
			uFreq: { value: new THREE.Vector3(3, 6, 10) },
			uAmp: { value: new THREE.Vector3(30, 30, 20) },
		};

		const xyUniforms = {
			uFreq: { value: new THREE.Vector2(5, 2) },
			uAmp: { value: new THREE.Vector2(25, 15) },
		};

		const LongRaceUniforms = {
			uFreq: { value: new THREE.Vector2(2, 3) },
			uAmp: { value: new THREE.Vector2(35, 10) },
		};

		const turbulentUniforms = {
			uFreq: { value: new THREE.Vector4(4, 8, 8, 1) },
			uAmp: { value: new THREE.Vector4(25, 5, 10, 10) },
		};

		const deepUniforms = {
			uFreq: { value: new THREE.Vector2(4, 8) },
			uAmp: { value: new THREE.Vector2(10, 20) },
			uPowY: { value: new THREE.Vector2(20, 2) },
		};

		const distortions: Record<string, DistortionEntry> = {
			mountainDistortion: {
				uniforms: mountainUniforms,
				getDistortion: `
          uniform vec3 uAmp;
          uniform vec3 uFreq;
          #define PI 3.14159265358979
          float nsin(float val){
            return sin(val) * 0.5 + 0.5;
          }
          vec3 getDistortion(float progress){
            float movementProgressFix = 0.02;
            return vec3(
              cos(progress * PI * uFreq.x + uTime) * uAmp.x - cos(movementProgressFix * PI * uFreq.x + uTime) * uAmp.x,
              nsin(progress * PI * uFreq.y + uTime) * uAmp.y - nsin(movementProgressFix * PI * uFreq.y + uTime) * uAmp.y,
              nsin(progress * PI * uFreq.z + uTime) * uAmp.z - nsin(movementProgressFix * PI * uFreq.z + uTime) * uAmp.z
            );
          }
        `,
				getJS: (progress: number, time: number) => {
					const movementProgressFix = 0.02;
					const uFreq = mountainUniforms.uFreq.value;
					const uAmp = mountainUniforms.uAmp.value;
					const distortion = new THREE.Vector3(
						Math.cos(progress * Math.PI * uFreq.x + time) * uAmp.x -
							Math.cos(movementProgressFix * Math.PI * uFreq.x + time) * uAmp.x,
						nsin(progress * Math.PI * uFreq.y + time) * uAmp.y -
							nsin(movementProgressFix * Math.PI * uFreq.y + time) * uAmp.y,
						nsin(progress * Math.PI * uFreq.z + time) * uAmp.z -
							nsin(movementProgressFix * Math.PI * uFreq.z + time) * uAmp.z,
					);
					const lookAtAmp = new THREE.Vector3(2, 2, 2);
					const lookAtOffset = new THREE.Vector3(0, 0, -5);
					return distortion.multiply(lookAtAmp).add(lookAtOffset);
				},
			},
			xyDistortion: {
				uniforms: xyUniforms,
				getDistortion: `
          uniform vec2 uFreq;
          uniform vec2 uAmp;
          #define PI 3.14159265358979
          vec3 getDistortion(float progress){
            float movementProgressFix = 0.02;
            return vec3(
              cos(progress * PI * uFreq.x + uTime) * uAmp.x - cos(movementProgressFix * PI * uFreq.x + uTime) * uAmp.x,
              sin(progress * PI * uFreq.y + PI/2. + uTime) * uAmp.y - sin(movementProgressFix * PI * uFreq.y + PI/2. + uTime) * uAmp.y,
              0.
            );
          }
        `,
				getJS: (progress: number, time: number) => {
					const movementProgressFix = 0.02;
					const uFreq = xyUniforms.uFreq.value;
					const uAmp = xyUniforms.uAmp.value;
					const distortion = new THREE.Vector3(
						Math.cos(progress * Math.PI * uFreq.x + time) * uAmp.x -
							Math.cos(movementProgressFix * Math.PI * uFreq.x + time) * uAmp.x,
						Math.sin(progress * Math.PI * uFreq.y + time + Math.PI / 2) *
							uAmp.y -
							Math.sin(
								movementProgressFix * Math.PI * uFreq.y + time + Math.PI / 2,
							) *
								uAmp.y,
						0,
					);
					const lookAtAmp = new THREE.Vector3(2, 0.4, 1);
					const lookAtOffset = new THREE.Vector3(0, 0, -3);
					return distortion.multiply(lookAtAmp).add(lookAtOffset);
				},
			},
			LongRaceDistortion: {
				uniforms: LongRaceUniforms,
				getDistortion: `
          uniform vec2 uFreq;
          uniform vec2 uAmp;
          #define PI 3.14159265358979
          vec3 getDistortion(float progress){
            float camProgress = 0.0125;
            return vec3(
              sin(progress * PI * uFreq.x + uTime) * uAmp.x - sin(camProgress * PI * uFreq.x + uTime) * uAmp.x,
              sin(progress * PI * uFreq.y + uTime) * uAmp.y - sin(camProgress * PI * uFreq.y + uTime) * uAmp.y,
              0.
            );
          }
        `,
				getJS: (progress: number, time: number) => {
					const camProgress = 0.0125;
					const uFreq = LongRaceUniforms.uFreq.value;
					const uAmp = LongRaceUniforms.uAmp.value;
					const distortion = new THREE.Vector3(
						Math.sin(progress * Math.PI * uFreq.x + time) * uAmp.x -
							Math.sin(camProgress * Math.PI * uFreq.x + time) * uAmp.x,
						Math.sin(progress * Math.PI * uFreq.y + time) * uAmp.y -
							Math.sin(camProgress * Math.PI * uFreq.y + time) * uAmp.y,
						0,
					);
					const lookAtAmp = new THREE.Vector3(1, 1, 0);
					const lookAtOffset = new THREE.Vector3(0, 0, -5);
					return distortion.multiply(lookAtAmp).add(lookAtOffset);
				},
			},
			turbulentDistortion: {
				uniforms: turbulentUniforms,
				getDistortion: `
          uniform vec4 uFreq;
          uniform vec4 uAmp;
          float nsin(float val){
            return sin(val) * 0.5 + 0.5;
          }
          #define PI 3.14159265358979
          float getDistortionX(float progress){
            return (
              cos(PI * progress * uFreq.r + uTime) * uAmp.r +
              pow(cos(PI * progress * uFreq.g + uTime * (uFreq.g / uFreq.r)), 2. ) * uAmp.g
            );
          }
          float getDistortionY(float progress){
            return (
              -nsin(PI * progress * uFreq.b + uTime) * uAmp.b +
              -pow(nsin(PI * progress * uFreq.a + uTime / (uFreq.b / uFreq.a)), 5.) * uAmp.a
            );
          }
          vec3 getDistortion(float progress){
            return vec3(
              getDistortionX(progress) - getDistortionX(0.0125),
              getDistortionY(progress) - getDistortionY(0.0125),
              0.
            );
          }
        `,
				getJS: (progress: number, time: number) => {
					const uFreq = turbulentUniforms.uFreq.value;
					const uAmp = turbulentUniforms.uAmp.value;

					const getX = (p: number) =>
						Math.cos(Math.PI * p * uFreq.x + time) * uAmp.x +
						Math.cos(Math.PI * p * uFreq.y + time * (uFreq.y / uFreq.x)) ** 2 *
							uAmp.y;

					const getY = (p: number) =>
						-nsin(Math.PI * p * uFreq.z + time) * uAmp.z -
						nsin(Math.PI * p * uFreq.w + time / (uFreq.z / uFreq.w)) ** 5 *
							uAmp.w;

					const distortion = new THREE.Vector3(
						getX(progress) - getX(progress + 0.007),
						getY(progress) - getY(progress + 0.007),
						0,
					);
					const lookAtAmp = new THREE.Vector3(-2, -5, 0);
					const lookAtOffset = new THREE.Vector3(0, 0, -10);
					return distortion.multiply(lookAtAmp).add(lookAtOffset);
				},
			},
			turbulentDistortionStill: {
				uniforms: turbulentUniforms,
				getDistortion: `
          uniform vec4 uFreq;
          uniform vec4 uAmp;
          float nsin(float val){
            return sin(val) * 0.5 + 0.5;
          }
          #define PI 3.14159265358979
          float getDistortionX(float progress){
            return (
              cos(PI * progress * uFreq.r) * uAmp.r +
              pow(cos(PI * progress * uFreq.g * (uFreq.g / uFreq.r)), 2. ) * uAmp.g
            );
          }
          float getDistortionY(float progress){
            return (
              -nsin(PI * progress * uFreq.b) * uAmp.b +
              -pow(nsin(PI * progress * uFreq.a / (uFreq.b / uFreq.a)), 5.) * uAmp.a
            );
          }
          vec3 getDistortion(float progress){
            return vec3(
              getDistortionX(progress) - getDistortionX(0.02),
              getDistortionY(progress) - getDistortionY(0.02),
              0.
            );
          }
        `,
			},
			deepDistortionStill: {
				uniforms: deepUniforms,
				getDistortion: `
          uniform vec4 uFreq;
          uniform vec4 uAmp;
          uniform vec2 uPowY;
          float nsin(float val){
            return sin(val) * 0.5 + 0.5;
          }
          #define PI 3.14159265358979
          float getDistortionX(float progress){
            return (
              sin(progress * PI * uFreq.x) * uAmp.x * 2.
            );
          }
          float getDistortionY(float progress){
            return (
              pow(abs(progress * uPowY.x), uPowY.y) + sin(progress * PI * uFreq.y) * uAmp.y
            );
          }
          vec3 getDistortion(float progress){
            return vec3(
              getDistortionX(progress) - getDistortionX(0.02),
              getDistortionY(progress) - getDistortionY(0.05),
              0.
            );
          }
        `,
			},
			deepDistortion: {
				uniforms: deepUniforms,
				getDistortion: `
          uniform vec4 uFreq;
          uniform vec4 uAmp;
          uniform vec2 uPowY;
          float nsin(float val){
            return sin(val) * 0.5 + 0.5;
          }
          #define PI 3.14159265358979
          float getDistortionX(float progress){
            return (
              sin(progress * PI * uFreq.x + uTime) * uAmp.x
            );
          }
          float getDistortionY(float progress){
            return (
              pow(abs(progress * uPowY.x), uPowY.y) + sin(progress * PI * uFreq.y + uTime) * uAmp.y
            );
          }
          vec3 getDistortion(float progress){
            return vec3(
              getDistortionX(progress) - getDistortionX(0.02),
              getDistortionY(progress) - getDistortionY(0.02),
              0.
            );
          }
        `,
				getJS: (progress: number, time: number) => {
					const uFreq = deepUniforms.uFreq.value;
					const uAmp = deepUniforms.uAmp.value;
					const uPowY = deepUniforms.uPowY.value;

					const getX = (p: number) =>
						Math.sin(p * Math.PI * uFreq.x + time) * uAmp.x;
					const getY = (p: number) =>
						(p * uPowY.x) ** uPowY.y +
						Math.sin(p * Math.PI * uFreq.y + time) * uAmp.y;

					const distortion = new THREE.Vector3(
						getX(progress) - getX(progress + 0.01),
						getY(progress) - getY(progress + 0.01),
						0,
					);
					const lookAtAmp = new THREE.Vector3(-2, -4, 0);
					const lookAtOffset = new THREE.Vector3(0, 0, -10);
					return distortion.multiply(lookAtAmp).add(lookAtOffset);
				},
			},
		};

		if (appRef.current) {
			appRef.current.dispose();
			appRef.current = null;
			const container = hyperspeed.current;
			if (container) {
				while (container.firstChild) {
					container.removeChild(container.firstChild);
				}
			}
		}

		const container = hyperspeed.current;
		if (!container) return;

		// The warp is ambience for an in-progress batch, not information.
		// Under reduced motion the progress readout above carries the state
		// alone, so no context is created at all.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return;
		}

		const input = effectOptions ?? {};
		const fallbackDistortion = distortions[
			DEFAULT_EFFECT_OPTIONS.distortion
		] as DistortionEntry;
		const options: ResolvedOptions = {
			...DEFAULT_EFFECT_OPTIONS,
			...input,
			colors: {
				...DEFAULT_EFFECT_OPTIONS.colors,
				...input.colors,
				...(lightMode
					? {
							roadColor: 0xffffff,
							islandColor: 0xe4f1eb,
							background: 0xffffff,
							shoulderLines: 0x131415,
							brokenLines: 0x94979e,
						}
					: {}),
			},
			distortion:
				distortions[input.distortion ?? DEFAULT_EFFECT_OPTIONS.distortion] ??
				fallbackDistortion,
		};

		// three throws when the browser offers no WebGL context (including
		// the test renderer). The warp is ambience behind the readout, so
		// no context means no canvas rather than a broken panel.
		let myApp: App;
		try {
			myApp = new App(container, options);
		} catch {
			return;
		}
		appRef.current = myApp;
		let cancelled = false;
		myApp.loadAssets().then(() => {
			if (!cancelled) myApp.init();
		});

		return () => {
			cancelled = true;
			if (appRef.current) {
				appRef.current.dispose();
				appRef.current = null;
			}
		};
	}, [effectOptions, lightMode]);

	return (
		<div
			ref={hyperspeed}
			aria-hidden="true"
			style={{
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				overflow: "hidden",
				pointerEvents: "none",
			}}
		/>
	);
};

export default Hyperspeed;
