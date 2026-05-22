import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei/core/Float";
import { Image } from "@react-three/drei/core/Image";
import { Line } from "@react-three/drei/core/Line";
import { RoundedBox } from "@react-three/drei/core/RoundedBox";
import { Text } from "@react-three/drei/core/Text";
import { useVideoTexture } from "@react-three/drei/core/VideoTexture";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { gsap } from "gsap";
import * as THREE from "three";

type OfficeSceneProps = {
  signalScore: number;
  jobCount: number;
  applicationCount: number;
};

const red = "#ff2a2a";
const cyan = "#6be7ff";
const media = {
  team: "/media/office-workers-pexels-7966581.jpg",
  teamVideo: "/media/office-workers-pexels-7966581.mp4",
  resume: "/media/resume-review-pexels-5439436.jpg",
  desk: "/media/office-desk-pexels-7731349.jpg",
};

export function OfficeScene(props: OfficeSceneProps) {
  return (
    <div className="office-webgl" aria-hidden="true">
      <Canvas
        camera={{ fov: 46, near: 0.1, far: 90, position: [0, 2.6, 11.6] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <color attach="background" args={["#020202"]} />
        <fog attach="fog" args={["#030406", 6, 26]} />
        <Suspense fallback={null}>
          <OfficeWorld {...props} />
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.68} luminanceThreshold={0.18} luminanceSmoothing={0.72} mipmapBlur />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}

function OfficeWorld({ signalScore, jobCount, applicationCount }: OfficeSceneProps) {
  const rootRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const pipelineRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const reducedMotion = useReducedMotion();
  const curvePoints = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-7.3, -0.92, 3.4),
        new THREE.Vector3(-4.7, -0.46, 0.55),
        new THREE.Vector3(-1.35, -0.32, -2.65),
        new THREE.Vector3(2.2, -0.38, -3.3),
        new THREE.Vector3(5.6, -0.7, -0.8),
      ]).getPoints(150),
    [],
  );
  const particles = useMemo(() => {
    const positions = new Float32Array(620 * 3);
    for (let index = 0; index < 620; index += 1) {
      const point = curvePoints[index % curvePoints.length];
      positions[index * 3] = point.x + (Math.random() - 0.5) * 5.6;
      positions[index * 3 + 1] = point.y + Math.random() * 3.6;
      positions[index * 3 + 2] = point.z + (Math.random() - 0.5) * 4.2;
    }
    return positions;
  }, [curvePoints]);
  const cameraPath = useMemo(
    () => [
      { p: 0, camera: new THREE.Vector3(0, 2.7, 11.6), target: new THREE.Vector3(0, 0.68, -2.2) },
      { p: 0.25, camera: new THREE.Vector3(-5.6, 2.15, 4.9), target: new THREE.Vector3(-1.35, 0.48, -2.4) },
      { p: 0.54, camera: new THREE.Vector3(-0.6, 2.08, 4.65), target: new THREE.Vector3(-3.8, 0.65, -2.4) },
      { p: 0.78, camera: new THREE.Vector3(5.2, 2.15, 4.1), target: new THREE.Vector3(3.9, 0.38, -2.6) },
      { p: 1, camera: new THREE.Vector3(0, 2.55, 9.4), target: new THREE.Vector3(0, 0.22, -2.35) },
    ],
    [],
  );

  useFrame(({ camera, pointer, clock }) => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = gsap.utils.clamp(0, 1, window.scrollY / maxScroll);
    const { camera: nextCamera, target } = interpolateCamera(cameraPath, progress);
    nextCamera.x += pointer.x * 0.34;
    nextCamera.y += pointer.y * -0.16;
    camera.position.lerp(nextCamera, reducedMotion ? 1 : 0.075);
    camera.lookAt(target);

    const elapsed = clock.getElapsedTime();
    if (rootRef.current && !reducedMotion) {
      rootRef.current.rotation.y = Math.sin(elapsed * 0.09) * 0.028;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = reducedMotion ? 0.35 : elapsed * 0.32;
    }
    if (pipelineRef.current && !reducedMotion) {
      pipelineRef.current.position.y = Math.sin(elapsed * 0.55) * 0.06;
    }
    if (particlesRef.current && !reducedMotion) {
      particlesRef.current.rotation.y = Math.sin(elapsed * 0.11) * 0.055;
    }
  });

  const signalNodes = Math.max(4, Math.min(14, jobCount + applicationCount + 4));

  return (
    <group ref={rootRef}>
      <ambientLight intensity={0.34} color="#9fb6cc" />
      <directionalLight position={[-5, 8, 7]} intensity={1.7} color="#9fdfff" />
      <pointLight position={[4.6, 2.3, -1.3]} intensity={26} distance={15} color={red} />
      <pointLight position={[-5.8, 3.2, -4.3]} intensity={14} distance={16} color={cyan} />

      <OfficeArchitecture />
      <ExecutiveScreens signalScore={signalScore} />
      <Workstations />
      <Documents />
      <Pipeline refGroup={pipelineRef} />

      <Line points={curvePoints} color={red} lineWidth={1.1} transparent opacity={0.62} />
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial color={red} size={0.033} transparent opacity={0.58} depthWrite={false} />
      </points>
      <mesh ref={ringRef} position={[-4.72, 1.9, 0.82]} rotation={[1.34, 0.18, 0.32]}>
        <torusGeometry args={[0.95 + signalScore / 240, 0.013, 10, 140]} />
        <meshBasicMaterial color={red} transparent opacity={0.42} wireframe />
      </mesh>
      {Array.from({ length: signalNodes }).map((_, index) => {
        const point = curvePoints[Math.floor((index / signalNodes) * (curvePoints.length - 1))];
        return (
          <Float key={index} speed={1.2 + index * 0.04} floatIntensity={0.28} rotationIntensity={0.18}>
            <mesh position={[point.x, point.y + 0.72 + Math.sin(index) * 0.32, point.z]}>
              <sphereGeometry args={[0.06 + (index % 3) * 0.012, 18, 18]} />
              <meshStandardMaterial
                color={index % 3 === 0 ? cyan : red}
                emissive={index % 3 === 0 ? cyan : red}
                emissiveIntensity={1.35}
                roughness={0.28}
              />
            </mesh>
          </Float>
        );
      })}
    </group>
  );
}

function OfficeArchitecture() {
  return (
    <group>
      <mesh position={[0, -1.08, -1.2]} receiveShadow>
        <boxGeometry args={[18, 0.08, 22]} />
        <meshStandardMaterial color="#101114" roughness={0.68} metalness={0.2} />
      </mesh>
      <mesh position={[0, 4.2, -1.2]}>
        <boxGeometry args={[18, 0.08, 22]} />
        <meshStandardMaterial color="#050506" roughness={0.72} metalness={0.25} />
      </mesh>
      <mesh position={[0, 1.48, -8.2]}>
        <boxGeometry args={[18, 5.2, 0.08]} />
        <meshStandardMaterial color="#050506" roughness={0.74} metalness={0.26} />
      </mesh>
      {[-8.2, 8.2].map((x) => (
        <mesh key={x} position={[x, 1.48, -1.2]}>
          <boxGeometry args={[0.08, 5.2, 22]} />
          <meshStandardMaterial color="#050506" roughness={0.74} metalness={0.26} />
        </mesh>
      ))}
      {Array.from({ length: 9 }).map((_, index) => {
        const value = -4 + index;
        return (
          <group key={value}>
            <mesh position={[value * 2, 4.16, -1.2]}>
              <boxGeometry args={[0.018, 0.018, 22]} />
              <meshBasicMaterial color={cyan} transparent opacity={0.26} />
            </mesh>
            <mesh position={[0, 4.17, -8 + value * 2]}>
              <boxGeometry args={[18, 0.018, 0.018]} />
              <meshBasicMaterial color={cyan} transparent opacity={0.18} />
            </mesh>
          </group>
        );
      })}
      <GlassRoom />
    </group>
  );
}

function GlassRoom() {
  return (
    <group position={[0, 0, -3.95]}>
      <RoundedBox args={[5.2, 0.18, 1.55]} radius={0.05} position={[0, -0.6, 0.75]}>
        <meshStandardMaterial color="#08090a" roughness={0.5} metalness={0.45} />
      </RoundedBox>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[4.4, 1.9, 0.045]} />
        <meshPhysicalMaterial
          color="#0b1418"
          roughness={0.15}
          metalness={0.05}
          transparent
          opacity={0.28}
          transmission={0.45}
        />
      </mesh>
      {[-2.55, 2.55].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]}>
          <boxGeometry args={[0.12, 2.55, 0.12]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.88} />
        </mesh>
      ))}
      <mesh position={[0, 1.78, 0]}>
        <boxGeometry args={[5.85, 0.075, 0.075]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.78} />
      </mesh>
    </group>
  );
}

function ExecutiveScreens({ signalScore }: { signalScore: number }) {
  return (
    <group>
      <VideoPanel
        src={media.teamVideo}
        width={4.8}
        height={2.7}
        position={[0, 1.82, -4.25]}
        label="SALA DE TRIAGEM"
      />
      <ImagePanel
        url={media.resume}
        width={3.2}
        height={1.88}
        position={[-5.15, 2.05, -2.55]}
        rotation={[0, 0.5, 0]}
        label="CURRICULO"
      />
      <ImagePanel
        url={media.desk}
        width={3.15}
        height={1.88}
        position={[5.2, 2.0, -2.45]}
        rotation={[0, -0.52, 0]}
        label="VAGAS"
      />
      <ImagePanel
        url={media.team}
        width={2.3}
        height={1.34}
        position={[6.45, 2.65, 0.4]}
        rotation={[0.04, -0.85, 0.02]}
        label={`${signalScore}% MATCH`}
      />
    </group>
  );
}

function ImagePanel({
  url,
  width,
  height,
  position,
  rotation = [0, 0, 0],
  label,
}: {
  url: string;
  width: number;
  height: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  label: string;
}) {
  return (
    <Float speed={1.45} floatIntensity={0.14} rotationIntensity={0.05}>
      <group position={position} rotation={rotation}>
        <RoundedBox args={[width + 0.18, height + 0.18, 0.08]} radius={0.045} smoothness={8}>
          <meshStandardMaterial color="#050506" roughness={0.38} metalness={0.6} />
        </RoundedBox>
        <Image url={url} scale={[width, height]} position={[0, 0, 0.055]} transparent toneMapped={false} />
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[width + 0.02, height + 0.02]} />
          <meshBasicMaterial color={red} transparent opacity={0.08} depthWrite={false} />
        </mesh>
        <Text
          position={[-width / 2 + 0.08, -height / 2 - 0.22, 0.06]}
          fontSize={0.13}
          letterSpacing={0.04}
          color={red}
          anchorX="left"
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    </Float>
  );
}

function VideoPanel({
  src,
  width,
  height,
  position,
  label,
}: {
  src: string;
  width: number;
  height: number;
  position: [number, number, number];
  label: string;
}) {
  const texture = useVideoTexture(src, {
    autoplay: true,
    loop: true,
    muted: true,
    start: true,
    playsInline: true,
  });

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  return (
    <group position={position}>
      <RoundedBox args={[width + 0.24, height + 0.24, 0.1]} radius={0.05} smoothness={8}>
        <meshStandardMaterial color="#030304" roughness={0.36} metalness={0.68} />
      </RoundedBox>
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#050505" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <Text position={[-width / 2 + 0.1, -height / 2 - 0.24, 0.08]} fontSize={0.15} color={cyan} anchorX="left">
        {label}
      </Text>
    </group>
  );
}

function Workstations() {
  const screens = [media.resume, media.team, media.desk, media.resume];
  return (
    <group>
      {screens.map((url, index) => {
        const x = -4.65 + index * 3.1;
        return <Workstation key={url + index} x={x} url={url} rotationY={index < 2 ? 0.06 : -0.06} />;
      })}
    </group>
  );
}

function Workstation({ x, url, rotationY }: { x: number; url: string; rotationY: number }) {
  return (
    <group position={[x, 0, 0.95]} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[2.2, 0.16, 1.24]} radius={0.035} position={[0, -0.69, 0]}>
        <meshStandardMaterial color="#070708" roughness={0.62} metalness={0.36} />
      </RoundedBox>
      {[-0.82, 0.82].flatMap((legX) =>
        [-0.42, 0.42].map((legZ) => (
          <mesh key={`${legX}-${legZ}`} position={[legX, -0.23, legZ]}>
            <boxGeometry args={[0.1, 0.9, 0.1]} />
            <meshStandardMaterial color="#060607" roughness={0.7} metalness={0.28} />
          </mesh>
        )),
      )}
      <group position={[0, 0.08, -0.55]} rotation={[-0.02, 0, 0]}>
        <RoundedBox args={[1.08, 0.68, 0.055]} radius={0.035} smoothness={8}>
          <meshStandardMaterial color="#050506" roughness={0.36} metalness={0.58} />
        </RoundedBox>
        <Image url={url} scale={[0.96, 0.56]} position={[0, 0, 0.04]} transparent toneMapped={false} />
      </group>
      <RoundedBox args={[0.78, 0.14, 0.78]} radius={0.08} position={[0, -0.72, 1.18]}>
        <meshStandardMaterial color="#08090a" roughness={0.6} metalness={0.25} />
      </RoundedBox>
      <RoundedBox args={[0.48, 0.72, 0.46]} radius={0.08} position={[0, -0.26, 1.18]}>
        <meshStandardMaterial color="#090a0b" roughness={0.54} metalness={0.2} />
      </RoundedBox>
    </group>
  );
}

function Documents() {
  return (
    <group position={[-3.25, -0.31, -2.08]} rotation={[-0.2, 0.12, -0.08]}>
      {Array.from({ length: 7 }).map((_, index) => (
        <mesh key={index} position={[index * 0.045, index * 0.032, -index * 0.025]}>
          <boxGeometry args={[0.95, 0.018, 1.3]} />
          <meshStandardMaterial color={index % 2 ? "#f2efe8" : "#dcd8cf"} roughness={0.55} metalness={0.02} />
        </mesh>
      ))}
      <Line points={[[-0.34, 0.1, 0.66], [0.22, 0.13, 0.66], [0.44, 0.15, 0.2]]} color={red} lineWidth={1.5} />
    </group>
  );
}

function Pipeline({ refGroup }: { refGroup: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={refGroup} position={[0, 0, 0]}>
      {["SALVA", "REVISAO", "ENVIO", "ENTREVISTA", "OFERTA"].map((label, index) => {
        const x = 3.35 + index * 0.66;
        return (
          <group key={label} position={[x, 0.23, -2.5]} rotation={[0, -0.42, 0]}>
            <RoundedBox args={[0.52, 1.75, 0.045]} radius={0.025}>
              <meshPhysicalMaterial color="#0a1114" transparent opacity={0.34} roughness={0.18} transmission={0.32} />
            </RoundedBox>
            <mesh position={[0, 0.78 - index * 0.24, 0.08]}>
              <sphereGeometry args={[0.075 + index * 0.006, 18, 18]} />
              <meshStandardMaterial color={index % 2 ? cyan : red} emissive={index % 2 ? cyan : red} emissiveIntensity={1.2} />
            </mesh>
            <Text position={[-0.18, -0.98, 0.08]} fontSize={0.065} color={red} anchorX="left">
              {label}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function interpolateCamera(
  path: Array<{ p: number; camera: THREE.Vector3; target: THREE.Vector3 }>,
  progress: number,
) {
  let from = path[0];
  let to = path[path.length - 1];
  for (let index = 0; index < path.length - 1; index += 1) {
    if (progress >= path[index].p && progress <= path[index + 1].p) {
      from = path[index];
      to = path[index + 1];
      break;
    }
  }
  const local = to.p === from.p ? 0 : (progress - from.p) / (to.p - from.p);
  return {
    camera: new THREE.Vector3(
      gsap.utils.interpolate(from.camera.x, to.camera.x, local),
      gsap.utils.interpolate(from.camera.y, to.camera.y, local),
      gsap.utils.interpolate(from.camera.z, to.camera.z, local),
    ),
    target: new THREE.Vector3(
      gsap.utils.interpolate(from.target.x, to.target.x, local),
      gsap.utils.interpolate(from.target.y, to.target.y, local),
      gsap.utils.interpolate(from.target.z, to.target.z, local),
    ),
  };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}
