"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ethers } from "ethers";
import { ImageIcon, Loader2, Wallet, Copy, ExternalLink, LogOut, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const NFT_CONTRACT_ABI = [
  "function mint() public",
  "function totalMinted() public view returns (uint256)",
  "function maxSupply() public view returns (uint256)",
  "function mintOpen() public view returns (bool)",
  "function hasMinted(address) public view returns (bool)",
  "function tokenURI(uint256 tokenId) public view returns (string)",
  "function balanceOf(address owner) public view returns (uint256)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
];

const NFT_CONTRACT_ADDRESS = "0xc2caa430DbfC1A7c381D54D735Ed9c55fD4112A8";

const INTUITION_TESTNET = {
  chainId: "0x350B", // 13579 in hex
  chainName: "Intuition Testnet",
  nativeCurrency: {
    name: "tTRUST",
    symbol: "tTRUST",
    decimals: 18,
  },
  rpcUrls: ["https://testnet.rpc.intuition.systems/http"],
  blockExplorerUrls: ["https://testnet.explorer.intuition.systems"],
};

const GLASSMORPHISM_STYLE = {
  background: "rgba(255, 255, 255, 0.15)",
  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
  backdropFilter: "blur(8.7px)",
  WebkitBackdropFilter: "blur(8.7px)",
};

const GLASSMORPHISM_DROPDOWN_STYLE = {
  background: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.2)"
};

const GLASSMORPHISM_ERROR_STYLE = {
  background: "rgba(255, 255, 255, 0.08)",
  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
  backdropFilter: "blur(6.0px)",
  WebkitBackdropFilter: "blur(6.0px)",
};

const TITLE_CLASSES = "text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-white text-center mb-8";
const BUTTON_PRIMARY_CLASSES = "w-full h-14 sm:h-16 text-base sm:text-lg font-semibold bg-white/95 text-gray-900 hover:bg-white hover:-translate-y-1 transition-all rounded-xl";
const BUTTON_SECONDARY_CLASSES = "w-full h-12 sm:h-14 text-sm sm:text-base font-semibold";

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
}

interface NFT {
  tokenId: number;
  metadata: NFTMetadata;
}

export default function NFTMintingPage() {
  const [account, setAccount] = useState<string>("");
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [maxSupply, setMaxSupply] = useState<number>(0);
  const [mintPrice, setMintPrice] = useState<string>("0");
  const [userNFTs, setUserNFTs] = useState<NFT[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string>("");
  const [showNetworkInstructions, setShowNetworkInstructions] = useState(false);
  const [userBalance, setUserBalance] = useState<string>("0");
  const [showDropdown, setShowDropdown] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Particle animation system - DEX Intuition style
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();

    const points: Array<{
      x: number;
      y: number;
      originX: number;
      originY: number;
      vx: number;
      vy: number;
      opacity: number;
      targetOpacity: number;
      size: number;
      connections: number[];
    }> = [];

    let mouseX = 0;
    let mouseY = 0;

    const createConstellationGrid = () => {
      const gridSize = 12; // 12x12 grid (further reduced density)
      const jitter = 40; // ±40px randomization (increased)

      for (let x = 0; x < window.innerWidth; x += window.innerWidth / gridSize) {
        for (let y = 0; y < window.innerHeight; y += window.innerHeight / gridSize) {
          if (Math.random() < 0.3) continue;

          const jitterX = (Math.random() - 0.5) * jitter * 2;
          const jitterY = (Math.random() - 0.5) * jitter * 2;

          points.push({
            x: x + jitterX,
            y: y + jitterY,
            originX: x + jitterX,
            originY: y + jitterY,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            opacity: 0.6 + Math.random() * 0.4,
            targetOpacity: 0.6 + Math.random() * 0.4,
            size: 1.5 + Math.random() * 1,
            connections: [],
          });
        }
      }
    };

    createConstellationGrid();

    const handleResize = () => {
      resizeCanvas();

      points.forEach((point) => {
        if (point.x > window.innerWidth) point.x = window.innerWidth - 50;
        if (point.y > window.innerHeight) point.y = window.innerHeight - 50;
        if (point.x < 0) point.x = 50;
        if (point.y < 0) point.y = 50;

        point.originX = Math.min(point.originX, window.innerWidth);
        point.originY = Math.min(point.originY, window.innerHeight);
      });
    };

    const regenerateParticles = () => {
      points.length = 0;

      const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 20000);
      const gridSize = Math.sqrt(particleCount);
      const jitter = 40;

      for (let x = 0; x < window.innerWidth; x += window.innerWidth / gridSize) {
        for (let y = 0; y < window.innerHeight; y += window.innerHeight / gridSize) {
          if (Math.random() < 0.2) continue;

          const jitterX = (Math.random() - 0.5) * jitter * 2;
          const jitterY = (Math.random() - 0.5) * jitter * 2;

          points.push({
            x: x + jitterX,
            y: y + jitterY,
            originX: x + jitterX,
            originY: y + jitterY,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            opacity: 0.6 + Math.random() * 0.4,
            targetOpacity: 0.6 + Math.random() * 0.4,
            size: 1.5 + Math.random() * 1,
            connections: [],
          });
        }
      }
    };

    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        handleResize();
        regenerateParticles();
      }, 100);
    };

    window.addEventListener("resize", debouncedResize);

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = event.clientX - rect.left;
      mouseY = event.clientY - rect.top;
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    let animationFrameId: number;

    const animate = () => {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const mouseAttraction = 200; // Attraction radius

      points.forEach((point, index) => {
        const dx = mouseX - point.x;
        const dy = mouseY - point.y;
        const mouseDistance = Math.sqrt(dx * dx + dy * dy);

        let attractionX = 0;
        let attractionY = 0;

        if (mouseDistance < mouseAttraction && mouseDistance > 0) {
          const attractionStrength = 1 - mouseDistance / mouseAttraction;
          attractionX = (dx / mouseDistance) * attractionStrength * 2;
          attractionY = (dy / mouseDistance) * attractionStrength * 2;
        }

        point.x += point.vx;
        point.y += point.vy;

        if (mouseDistance < mouseAttraction && mouseDistance > 0) {
          const attractionStrength = 1 - mouseDistance / mouseAttraction;
          point.vx += attractionX * attractionStrength * 0.002;
          point.vy += attractionY * attractionStrength * 0.002;
        }

        if (point.x < 0 || point.x > window.innerWidth) {
          point.vx *= -1;
          point.x = Math.max(0, Math.min(window.innerWidth, point.x));
        }
        if (point.y < 0 || point.y > window.innerHeight) {
          point.vy *= -1;
          point.y = Math.max(0, Math.min(window.innerHeight, point.y));
        }

        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${point.opacity})`;
        ctx.fill();
      });

      const maxConnectionsPerPoint = 2;
      const maxDistance = 100;
      const minOpacity = 0.1;
      const maxOpacity = 0.4;

      points.forEach((particle, i) => {
        let connectionCount = 0;

        for (let j = i + 1; j < points.length; j++) {
          if (connectionCount >= maxConnectionsPerPoint) break;

          const otherParticle = points[j];
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
              const distanceRatio = distance / maxDistance;
            const lineOpacity = maxOpacity - distanceRatio * (maxOpacity - minOpacity);

            if (lineOpacity > minOpacity) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.strokeStyle = `rgba(255, 255, 255, ${lineOpacity})`;
              ctx.lineWidth = 1;
              ctx.stroke();
              connectionCount++;
            }
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", debouncedResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(resizeTimeout);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const connectWallet = async () => {

    if (typeof window.ethereum === "undefined") {
      setNetworkError("Please install MetaMask or another Web3 wallet!");
      return;
    }

    setIsConnecting(true);
    setNetworkError("");

    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });

      if (chainId !== INTUITION_TESTNET.chainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: INTUITION_TESTNET.chainId }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [INTUITION_TESTNET],
              });
            } catch (addError) {
              console.error("[v0] Error adding network:", addError);
              setNetworkError("Failed to add Intuition testnet automatically.");
              setShowNetworkInstructions(true);
              return;
            }
          } else {
            console.error("[v0] Error switching network:", switchError);
            setNetworkError(
              `Network mismatch. Your wallet shows chain ID: ${chainId}, but we need: ${INTUITION_TESTNET.chainId}`,
            );
            setShowNetworkInstructions(true);
            return;
          }
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      const accounts = await provider.send("eth_requestAccounts", []);

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setProvider(provider);
        setNetworkError("");
        setShowNetworkInstructions(false);

        const signer = await provider.getSigner();
        const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, signer);
        setContract(contract);

        await loadContractData(contract);
        await loadUserBalance(provider, accounts[0]);
        await loadUserNFTs(contract, accounts[0]);
      } else {
        setNetworkError("No accounts found. Please unlock your wallet.");
      }
    } catch (error) {
      console.error("[v0] Error connecting wallet:", error);
      setNetworkError(
        `Failed to connect wallet: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const loadContractData = async (contract: ethers.Contract) => {
    try {
      const [totalMinted, maxSupply] = await Promise.all([
        contract.totalMinted(),
        contract.maxSupply(),
      ]);

      setTotalSupply(Number(totalMinted));
      setMaxSupply(Number(maxSupply));
      setMintPrice("0"); // Always free mint
    } catch (error) {
      console.error("Error loading contract data:", error);
      setTotalSupply(0);
      setMaxSupply(1000);
      setMintPrice("0");
    }
  };

  const loadUserBalance = async (provider: ethers.BrowserProvider, userAddress: string) => {
    try {
      const balance = await provider.getBalance(userAddress);
      const balanceInEth = ethers.formatEther(balance);
      const formattedBalance = parseFloat(balanceInEth).toFixed(1);
      setUserBalance(formattedBalance);
    } catch (error) {
      console.error("Error loading user balance:", error);
      setUserBalance("0");
    }
  };

  const loadUserNFTs = async (contract: ethers.Contract, userAddress: string) => {
    setIsLoading(true);
    try {
      const balance = await contract.balanceOf(userAddress);
      const nfts: NFT[] = [];

      // This is a simplified approach - in production you'd want a better method
      const totalMinted = await contract.totalMinted();

      for (let tokenId = 1; tokenId <= Number(totalMinted); tokenId++) {
        try {
          const owner = await contract.ownerOf(tokenId);

          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            try {
              const tokenURI = await contract.tokenURI(tokenId);

              let metadata: NFTMetadata;

              if (tokenURI.startsWith("http")) {
                // Fetch metadata from HTTP/IPFS URL
                const response = await fetch(tokenURI);
                metadata = await response.json();
              } else {
                metadata = {
                  name: `Genesis NFT #${tokenId}`,
                  description: `Intuition Network early builder badge #${tokenId}`,
                  image: `/genesis-nft.png`,
                };
              }

              nfts.push({ tokenId: Number(tokenId), metadata });
            } catch (metadataError) {
              console.error("Error fetching metadata for token", tokenId, ":", metadataError);
              nfts.push({
                tokenId: Number(tokenId),
                metadata: {
                  name: `Genesis NFT #${tokenId}`,
                  description: `Intuition Network early builder badge #${tokenId}`,
                  image: `/genesis-nft.png`,
                },
              });
            }
          }
        } catch (ownerError) {
          continue;
        }
      }

      setUserNFTs(nfts);
    } catch (error) {
      console.error("Error loading user NFTs:", error);
      setUserNFTs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const mintNFT = async () => {
    if (!contract || !account) {
      setNetworkError("Wallet not connected properly");
      return;
    }

    setIsMinting(true);
    setNetworkError("");

    try {

      const hasMinted = await contract.hasMinted(account);
      if (hasMinted) {
        setNetworkError("You have already minted your NFT");
        return;
      }

      const mintOpen = await contract.mintOpen();
      if (!mintOpen) {
        setNetworkError("Minting is currently closed");
        return;
      }

      const tx = await contract.mint();


      await tx.wait();

      await loadContractData(contract);
      await loadUserNFTs(contract, account);

    } catch (error: any) {
      console.error("Error minting NFT:", error);

      if (error.code === "INSUFFICIENT_FUNDS") {
        setNetworkError("Insufficient funds for transaction");
      } else if (error.code === "USER_REJECTED") {
        setNetworkError("Transaction cancelled by user");
      } else if (error.message?.includes("execution reverted")) {
        setNetworkError("Contract error: " + (error.reason || "Transaction failed"));
      } else {
        setNetworkError("Failed to mint NFT: " + (error.message || "Unknown error"));
      }
    } finally {
      setIsMinting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    setProvider(null);
    setContract(null);
    setUserNFTs([]);
    setNetworkError("");
    setShowNetworkInstructions(false);
    setUserBalance("0");
  };

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      {/* Black background to prevent white flash */}
      <div className="fixed inset-0 bg-black z-0" />
      {/* Canvas animation background - matches DEX Intuition style */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ width: "100vw", height: "100vh", backgroundColor: "black" }}
      />
      <header className="fixed top-0 left-0 right-0 z-20 h-16 sm:h-18 lg:h-20">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            <h1 className="text-lg xs:text-xl font-bold text-white tracking-wide">GENESIS NFT</h1>

            {account ? (
              <div className="relative" ref={dropdownRef}>
                <div
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 cursor-pointer transition-all rounded-xl hover:scale-105 bg-white/95 border border-black/10 text-gray-900 font-semibold text-xs sm:text-sm"
                >
                  <span className="font-bold text-gray-900 hidden xs:inline">
                    {userBalance} tTRUST
                  </span>
                  <div className="flex items-center gap-1 sm:gap-2 pl-0 xs:pl-3 border-l-0 xs:border-l border-black/10">
                    <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
                    <span className="text-gray-600 font-medium text-xs sm:text-sm">
                      {`${account.slice(0, 3)}...${account.slice(-3)}`}
                    </span>
                    <ChevronDown className={`w-3 sm:w-4 h-3 sm:h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-full rounded-lg shadow-lg z-50"
                       style={GLASSMORPHISM_DROPDOWN_STYLE}>
                    <div className="py-2">
                      <button 
                        onClick={() => {
                          window.open('https://testnet.explorer.intuition.systems', '_blank');
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-white/50 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on Intuition-Testnet Explorer
                      </button>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(account);
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-white/50 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Address
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button 
                        onClick={() => {
                          disconnectWallet();
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2 h-9 sm:h-10 px-4 sm:px-5 text-xs sm:text-sm bg-white/95 text-gray-900 hover:bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-lg font-semibold"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 min-h-screen pt-20 sm:pt-24 lg:pt-28 flex flex-col">
        <div className="flex-1 flex flex-col">
          <div className="text-center">
            <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold mb-4 bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent leading-tight">
              Hello Intuition Builder
            </h2>
            <p className="text-sm xs:text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
              An early builder badge on the Intuition Network.
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {(networkError || showNetworkInstructions) && (
              <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
                <Card
                  className="border-red-500/50 rounded-2xl"
                  style={GLASSMORPHISM_ERROR_STYLE}
                >
                  <CardHeader>
                    <CardTitle className="text-red-400 flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Network Setup Required
                    </CardTitle>
                    <CardDescription className="text-red-300">{networkError}</CardDescription>
                  </CardHeader>
                  {showNetworkInstructions && (
                    <CardContent className="space-y-3 sm:space-y-4 p-0">
                      <div className="text-sm text-gray-400 space-y-2">
                        <p className="font-semibold">To manually add Intuition Testnet:</p>
                        <ol className="list-decimal list-inside space-y-1 text-gray-400">
                          <li>Open your wallet settings</li>
                          <li>Go to "Networks" or "Add Network"</li>
                          <li>Add a new network with these details:</li>
                        </ol>
                        <div className="bg-gray-900 p-3 rounded-md text-xs font-mono text-gray-300 space-y-1">
                          <div>
                            <strong>Network Name:</strong> Intuition Testnet
                          </div>
                          <div>
                            <strong>RPC URL:</strong> https://testnet.rpc.intuition.systems/http
                          </div>
                          <div>
                            <strong>Chain ID:</strong> 13579
                          </div>
                          <div>
                            <strong>Currency Symbol:</strong> tTRUST
                          </div>
                          <div>
                            <strong>Block Explorer:</strong>{" "}
                            https://testnet.explorer.intuition.systems
                          </div>
                        </div>
                      </div>
                      <Button onClick={connectWallet} disabled={isConnecting} className="w-full">
                        {isConnecting ? "Connecting..." : "Try Again"}
                      </Button>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}

            {/* Mint card - only show when wallet not connected */}
            {!account && (
              <div>
                <h3 className={TITLE_CLASSES}>
                  Mint Your NFT
                </h3>
                <div className="max-w-lg mx-auto w-full mb-6">
                  <Card
                    className="p-6 sm:p-8 lg:p-10 rounded-2xl border-0"
                    style={GLASSMORPHISM_STYLE}
                  >
                    <CardHeader className="text-center p-0 mb-6">
                      <CardDescription className="text-white/70 text-base sm:text-lg">
                        Connect your wallet to get started
                      </CardDescription>
                    </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={connectWallet}
                      disabled={isConnecting}
                      className={BUTTON_PRIMARY_CLASSES}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wallet className="h-5 w-5 mr-2" />
                          Connect Wallet
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
                </div>
              </div>
            )}

            {/* Stats cards - only show when wallet not connected */}
            {!account && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto w-full">
                <Card
                  className="text-center p-5 sm:p-6 hover:bg-white/5 transition-all duration-300 rounded-2xl border-0"
                  style={GLASSMORPHISM_STYLE}
                >
                  <CardHeader className="text-center p-0">
                    <CardTitle className="text-xl sm:text-2xl font-extrabold text-white mb-2">
                      {totalSupply}/{maxSupply}
                    </CardTitle>
                    <CardDescription className="text-white/60 text-sm sm:text-base font-medium">
                      Minted Supply
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card
                  className="text-center p-5 sm:p-6 hover:bg-white/5 transition-all duration-300 rounded-2xl border-0"
                  style={GLASSMORPHISM_STYLE}
                >
                  <CardHeader className="text-center p-0">
                    <CardTitle className="text-xl sm:text-2xl font-extrabold text-white mb-2">
                      {mintPrice === "0" ? "Free Mint" : `${mintPrice} tTRUST`}
                    </CardTitle>
                    <CardDescription className="text-white/60 text-sm sm:text-base font-medium">
                      Mint Price
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>

          {/* When wallet connected - show either mint interface or collection */}
          {account && (
            <div className="flex-1 flex flex-col justify-center">
              {/* Mint interface when connected but no NFTs */}
              {userNFTs.length === 0 && (
                <div>
                  <h3 className={TITLE_CLASSES}>
                    Mint Your NFT
                  </h3>
                  <div className="max-w-md mx-auto w-full mb-20">
                    <Card
                      className="p-5 xs:p-6 sm:p-8 rounded-2xl border-0"
                      style={GLASSMORPHISM_STYLE}
                    >
                      <CardHeader className="text-center p-0 mb-4 sm:mb-6">
                        <CardDescription className="text-white/70 text-sm sm:text-base">
                          Ready to mint your unique NFT
                        </CardDescription>
                      </CardHeader>
                    <CardContent className="space-y-4">
                      {!networkError && !isMinting && (
                        <div className="text-center text-sm text-emerald-400 bg-emerald-900/30 p-2 rounded-md">
                          ✓ Connected to Intuition Testnet
                        </div>
                      )}

                      <Button
                        onClick={mintNFT}
                        disabled={isMinting || totalSupply >= maxSupply || !!networkError}
                        className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 hover:-translate-y-1 transition-all rounded-xl"
                      >
                        {isMinting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Minting...
                          </>
                        ) : totalSupply >= maxSupply ? (
                          "Sold Out"
                        ) : (
                          `${mintPrice === "0" ? "Mint Free" : `Mint for ${mintPrice} tTRUST`}`
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                  </div>
                </div>
              )}

              {/* Collection when user has NFTs */}
              {userNFTs.length > 0 && (
                <div>
                  <h3 className={TITLE_CLASSES}>
                    Your NFT
                  </h3>

                  {isLoading ? (
                    <div className="flex justify-center items-center py-6 sm:py-8 lg:py-12">
                      <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
                      <span className="ml-2 text-xs sm:text-sm text-gray-400">
                        Loading your NFTs...
                      </span>
                    </div>
                  ) : userNFTs.length > 0 ? (
                    <div className="flex justify-center">
                      <div className="max-w-sm w-full">
                        {userNFTs.map((nft) => (
                          <Card
                            key={nft.tokenId}
                            className="hover:scale-[1.02] transition-all duration-300 cursor-pointer group hover:bg-white/5 relative z-10 overflow-hidden rounded-2xl border-0"
                            style={GLASSMORPHISM_STYLE}
                          >
                            <div className="aspect-square relative overflow-hidden bg-gray-800">
                              <img
                                src={nft.metadata.image || "/genesis-nft.png"}
                                alt={nft.metadata.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <CardContent className="p-5 sm:p-6">
                              <h4 className="font-serif font-bold text-base sm:text-lg lg:text-xl text-white mb-3 text-center">
                                {nft.metadata.name}
                              </h4>
                              <p className="text-sm sm:text-base text-gray-300 text-center mb-4 leading-relaxed">
                                {nft.metadata.description}
                              </p>
                              <div className="flex justify-center">
                                <Badge
                                  variant="outline"
                                  className="text-sm text-gray-400 border-gray-500 px-3 py-1"
                                >
                                  #{nft.tokenId}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 xs:py-8 sm:py-12 lg:py-16">
                      <ImageIcon className="h-10 w-10 xs:h-12 xs:w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                      <h4 className="text-base xs:text-lg sm:text-xl font-serif font-bold text-white mb-2">
                        No NFTs Yet
                      </h4>
                      <p className="text-xs xs:text-sm sm:text-base text-gray-400 max-w-md mx-auto px-4">
                        Mint your first NFT to see it appear in your collection!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="w-full text-center py-6 mt-auto">
          <p className="text-xs sm:text-sm text-gray-400">
            Built with React, Ethers.js, and modern Web3 technologies
          </p>
        </footer>
      </main>
    </div>
  );
}
