import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { ContactShadows, Sky } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";

const SUN_POSITION: [number, number, number] = [48, 36, 18];

/** ACES grading plus a local studio environment so glass and metal reflect without a network HDR. */
export function SceneLook() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useLayoutEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.08;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;

    const pmrem = new THREE.PMREMGenerator(gl);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;

    return () => {
      scene.environment = null;
      environment.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <Sky
        sunPosition={SUN_POSITION}
        turbidity={3.2}
        rayleigh={0.85}
        mieCoefficient={0.004}
        mieDirectionalG={0.82}
      />
      <hemisphereLight args={["#dbeafe", "#f3f4f6", 0.42]} />
      <ambientLight intensity={0.18} />
      <directionalLight
        position={SUN_POSITION}
        intensity={2.4}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00025}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
      />
      <directionalLight position={[-24, 14, -18]} intensity={0.28} color="#c7d7ee" />
    </>
  );
}

export function SiteGround({ span }: { span: number }) {
  const size = Math.max(80, span * 3.2);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#ffffff" roughness={0.92} metalness={0} />
      </mesh>
      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.38}
        scale={Math.max(40, span * 1.8)}
        blur={2.4}
        far={Math.max(12, span * 0.35)}
        resolution={512}
        color="#1c2418"
      />
    </group>
  );
}
