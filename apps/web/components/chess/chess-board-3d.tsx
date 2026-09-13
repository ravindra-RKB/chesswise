'use client';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';
import { Square, Chess, fenToPieceMap, getLegalMovesForSquare } from '@chesswise/chess-core';

const SQUARE_SIZE = 1;
const BOARD_OFFSET = (8 * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2;

// Maps 'a1' to 3D coordinates
function squareToPos(sq: string, orientation: 'white' | 'black') {
  const file = sq.charCodeAt(0) - 97; // 'a' -> 0, 'h' -> 7
  const rank = parseInt(sq.charAt(1)) - 1; // '1' -> 0, '8' -> 7

  let x = file * SQUARE_SIZE - BOARD_OFFSET;
  let z = -(rank * SQUARE_SIZE - BOARD_OFFSET); // -z is forward in WebGL

  if (orientation === 'black') {
    x = -x;
    z = -z;
  }
  return [x, 0, z] as [number, number, number];
}

interface PieceData {
  id: string;
  type: string; // 'p', 'n', 'b', 'r', 'q', 'k'
  color: 'w' | 'b';
  square: Square;
}

// Preload individual piece models
useGLTF.preload('/pawn.gltf');
useGLTF.preload('/knight.gltf');
useGLTF.preload('/bishop.gltf');
useGLTF.preload('/rook.gltf');
useGLTF.preload('/queen.gltf');
useGLTF.preload('/king.gltf');

function Piece({ data, orientation, onClick, isSelected }: any) {
  const [x, y, z] = squareToPos(data.square, orientation);

  const pawnGLTF = useGLTF('/pawn.gltf') as any;
  const knightGLTF = useGLTF('/knight.gltf') as any;
  const bishopGLTF = useGLTF('/bishop.gltf') as any;
  const rookGLTF = useGLTF('/rook.gltf') as any;
  const queenGLTF = useGLTF('/queen.gltf') as any;
  const kingGLTF = useGLTF('/king.gltf') as any;

  const typeMap = {
    p: pawnGLTF.nodes.Object001.geometry,
    n: knightGLTF.nodes.Object001.geometry,
    b: bishopGLTF.nodes.Object001.geometry,
    r: rookGLTF.nodes.Object001.geometry,
    q: queenGLTF.nodes.Object001.geometry,
    k: kingGLTF.nodes.Object001.geometry,
  };

  const geometry = typeMap[data.type.toLowerCase() as keyof typeof typeMap];

  const { position } = useSpring({
    position: [x, isSelected ? y + 0.3 : y, z],
    config: { mass: 1, tension: 170, friction: 26 },
  });

  // Knight needs rotation
  let rotation: [number, number, number] = [0, 0, 0];
  if (data.type.toLowerCase() === 'n') {
    rotation[1] += data.color === 'b' ? Math.PI : 0; // The knight model might face differently
  }

  return (
    <a.mesh
      position={position as any}
      rotation={rotation}
      scale={[0.03, 0.03, 0.03]}
      geometry={geometry}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onClick(data.square);
      }}
    >
      <meshPhysicalMaterial
        color={data.color === 'w' ? '#d9d9d9' : '#4a4a4a'}
        metalness={0.2}
        roughness={0.2}
        clearcoat={0.8}
        clearcoatRoughness={0.2}
      />
    </a.mesh>
  );
}

function BoardSquares({ orientation, selected, legalTargets, onSquareClick }: any) {
  const squares = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const sq = (String.fromCharCode(97 + file) + (rank + 1)) as Square;
      const [x, _y, z] = squareToPos(sq, orientation);
      const isBlack = (rank + file) % 2 === 0;

      const isSelected = selected === sq;
      const isLegal = legalTargets.includes(sq);

      let color = isBlack ? '#739552' : '#EBECD0';
      if (isSelected) color = '#f5f682';
      else if (isLegal) color = '#d35400';

      squares.push(
        <mesh
          key={sq}
          position={[x, 0.01, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onSquareClick(sq);
          }}
          receiveShadow
        >
          <planeGeometry args={[SQUARE_SIZE, SQUARE_SIZE]} />
          <meshStandardMaterial color={color} />
        </mesh>,
      );
    }
  }
  return <group>{squares}</group>;
}

export default function ChessBoard3D({
  fen,
  orientation = 'white',
  onMove,
  interactive = true,
}: any) {
  const [pieces, setPieces] = useState<PieceData[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);

  const game = useMemo(() => new Chess(fen), [fen]);

  // Sync FEN to pieces with stable IDs for animation
  useEffect(() => {
    const map = fenToPieceMap(fen);

    // Very simple diff: just recreate all for now, but to animate properly we need stable IDs.
    // For a real robust diff, we compare old pieces to new map.
    setPieces((prev) => {
      const next: PieceData[] = [];
      const usedIds = new Set<string>();

      // For each square in the new FEN
      Object.entries(map).forEach(([sq, pStr]) => {
        if (!pStr) return;
        const color = pStr === pStr.toUpperCase() ? 'w' : 'b';
        const type = pStr.toLowerCase();

        // Find if this exact piece existed on this square previously
        let existing = prev.find(
          (p) => p.square === sq && p.type === type && p.color === color && !usedIds.has(p.id),
        );

        // If not, maybe it moved here?
        if (!existing) {
          existing = prev.find((p) => p.type === type && p.color === color && !usedIds.has(p.id));
        }

        if (existing) {
          usedIds.add(existing.id);
          next.push({ ...existing, square: sq as Square });
        } else {
          // New piece (e.g. pawn promotion or board reset)
          const newId = Math.random().toString(36).substring(7);
          usedIds.add(newId);
          next.push({ id: newId, type, color, square: sq as Square });
        }
      });
      return next;
    });
  }, [fen]);

  const handleSquareClick = useCallback(
    (sq: Square) => {
      if (!interactive) return;

      if (selected && legalTargets.includes(sq)) {
        onMove?.(selected, sq);
        setSelected(null);
        setLegalTargets([]);
        return;
      }

      const pStr = fenToPieceMap(game.fen())[sq];
      const isOwnPiece =
        pStr && (game.turn() === 'w' ? pStr === pStr.toUpperCase() : pStr === pStr.toLowerCase());

      if (pStr && isOwnPiece) {
        setSelected(sq);
        setLegalTargets(getLegalMovesForSquare(game, sq));
        return;
      }

      setSelected(null);
      setLegalTargets([]);
    },
    [interactive, selected, legalTargets, game, onMove],
  );

  return (
    <div className="h-full min-h-[600px] w-full overflow-hidden rounded-lg bg-[#222] ring-4 ring-[#333]">
      <Canvas shadows camera={{ position: [0, 5, 7], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        <BoardSquares
          orientation={orientation}
          selected={selected}
          legalTargets={legalTargets}
          onSquareClick={handleSquareClick}
        />

        <group>
          {pieces.map((p) => (
            <Piece
              key={p.id}
              data={p}
              orientation={orientation}
              onClick={handleSquareClick}
              isSelected={selected === p.square}
            />
          ))}
        </group>

        {/* Board Base / Frame */}
        <mesh position={[0, -0.3, 0]} receiveShadow>
          <boxGeometry args={[8 * SQUARE_SIZE + 0.5, 0.5, 8 * SQUARE_SIZE + 0.5]} />
          <meshStandardMaterial color="#333" />
        </mesh>

        <ContactShadows position={[0, -0.04, 0]} opacity={0.4} scale={10} blur={2} far={4} />
        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.5}
          minDistance={5}
          maxDistance={15}
        />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
