/* eslint-disable react-hooks/exhaustive-deps */
import "../Home/Main.css";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { useLoading } from "../../lib/loading";
import useApi from "../../hooks/useApi";
import issLocation from "../../api/iss-now";
import calcPosFromLatLonRad from "../../utils/calcPosFromLatLong";

//Textures
import moon from "../../Images/moon.jpeg";
import clouds from "../../Images/earthCloud.png";
import Galaxy from "../../Images/galaxy.png";

//Components
import NavBar from "../NavBar/NavBar";

export default function Main() {
  //Groups
  const iss = new THREE.Group();
  const earth = new THREE.Group();

  const mountRef = useRef(null);
  const loading = useLoading();

  const [issInfo, setIssInfo] = useState({
    latitude: 0.0,
    longitude: 0.0,
    altitude: 0.0,
    velocity: 0.0,
  });
  const getIssLocationNow = useApi(issLocation.getIssLocationNow);

  const getIssLocation = async () => {
    const issLocation = await getIssLocationNow.request();
    const { altitude, latitude, longitude, velocity } = issLocation?.data;
    setIssInfo({ altitude, latitude, longitude, velocity });
    const pos = calcPosFromLatLonRad({
      lat: latitude,
      lon: longitude,
      radius: 1,
    });
    iss.position.set(pos.x, pos.y, pos.z);
  };

  useEffect(() => {
    //Get the iss location when the page loads
    getIssLocation();

    //Data from the canvas
    const currentRef = mountRef.current;
    const { clientWidth: width, clientHeight: height } = currentRef;

    //Scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 100);
    scene.add(camera);
    camera.position.set(3, 3, 4);
    camera.lookAt(new THREE.Vector3());

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);
    currentRef.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false;

    const loader = new THREE.TextureLoader();
    const texture = loader.load(Galaxy);
    const skybox = new THREE.Mesh(
      new THREE.SphereGeometry(10, 10, 10), // radius, widthSegments, heightSegments
      new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
      })
    );
    scene.add(skybox);

    // moon
    const moonTexture = new THREE.TextureLoader().load(moon);
    const moonMaterial = new THREE.MeshPhongMaterial({ map: moonTexture });
    const moonGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.position.set(4, 4, 4);
    scene.add(moonMesh);

    //Interval update position
    const interval = setInterval(() => getIssLocation(), 2000);

    //OrbitControls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;

    //Resize canvas
    const resize = () => {
      renderer.setSize(currentRef.clientWidth, currentRef.clientHeight);
      camera.aspect = currentRef.clientWidth / currentRef.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", resize);

    //Draco Loader
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("./draco/");

    //GLTF Loader
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    //ISS Model
    gltfLoader.load(
      "./models/iss/issDraco.gltf",
      (gltf) => {
        gltf.scene.scale.set(0.014, 0.014, 0.014);
        iss.add(gltf.scene);
        scene.add(iss);
      },
      () => {
        loading.navigate(true);
      }
    );

    //Earth Model
    gltfLoader.load(
      "./models/earth/Earth.gltf",
      (gltf) => {
        gltf.scene.scale.set(0.0033, 0.0033, 0.0033);
        gltf.scene.rotateY(-4.7);
        earth.add(gltf.scene);
        scene.add(earth);
        loading.navigate(false);
      },
      () => {
        loading.navigate(true);
      },
      () => {
        loading.navigate(false);
      }
    );

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 32, 32),
      new THREE.MeshPhongMaterial({
        transparent: true,
        opacity: 0.02,
      })
    );
    atmosphere.scale.set(40, 40, 40);
    earth.add(atmosphere);

    //Clouds
    const cloudTexture = new THREE.TextureLoader().load(clouds);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.8,
    });
    const cloudGeometry = new THREE.SphereGeometry(0.022, 32, 32);
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloudMesh.scale.set(40, 40, 40);
    earth.add(cloudMesh);

    //Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(6, 6, 6);
    scene.add(pointLight);

    //Animate the scene
    const animate = () => {
      orbitControls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      currentRef.removeChild(renderer.domElement);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="Main">
      <NavBar about={false} />
      <div
        className="Contenedor3D"
        ref={mountRef}
        style={{
          width: "100%",
          height: "100vh",
        }}
      ></div>
    </div>
  );
}
