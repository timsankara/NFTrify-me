import React, { useState } from "react";
import "./nft-minter.css";
import Web3 from "web3";
import Moralis from "moralis";
import { useMoralis } from "react-moralis";
import { Success } from "../success/Success";
import { ConnectWallet } from "../auth/ConnectWallet";
// Contract Address and ABI
import { contractAddress, contractABI } from "../../contracts/nft-contract";

export default function NftMinter() {
    const { isAuthenticated, user } = useMoralis();
    const [nftName, setnftName] = useState("");
    const [nftAddress, setNftAddress] = useState("");
    const [isminted, setisminted] = useState(false);
    const [isMinting, setisMinting] = useState(false);
    const [mintingStatus, setmintingStatus] = useState("");
    const [ai_image_prompt, setAiImagePrompt] = useState("");
    const [image, setImage] = useState("");
    const [raw_image, setRawImage] = useState("");
    const [hide_minter, setHideMinter] = useState(true);
    const [generating_ai_img, setGeneratingAiImage] = useState(false);

    // Get the current web3 provider
    let web3 = new Web3(Web3.givenProvider);

    // Minting logic
    const mintNft = async (e) => {
        e.preventDefault();
        // 1. Set Minting to true
        if (nftName === "") {
            alert("Please enter a name for your NFT");
            return;
        }
        setisMinting(true);
        try {
            // 2. Upload the NFT to IPFS
            setmintingStatus("Uploading NFT image...");

            const file_object = new File([raw_image], ai_image_prompt + ".jpeg", { type: "image/jpeg" });
            const file = new Moralis.File(ai_image_prompt, file_object);

            await file.saveIPFS();
            const fileUrl = file.ipfs();


            // Get the file ID from the IPFS hash
            const fileId = fileUrl.split("/")[4];
            // 4. Use Moralis gateway url to access the file
            const moralisGateWayIPFAddress = "https://gateway.moralisipfs.com/ipfs";
            const gatewayFileUrlAddress = `${moralisGateWayIPFAddress}/${fileId}`;

            // NFT meta data object
            const nftMetaData = {
                name: nftName,
                description: ai_image_prompt,
                image: gatewayFileUrlAddress,
            };

            // NFT minting logic
            const metaDataFile = new Moralis.File(`${nftName}metadata.json`, {
                base64: Buffer.from(JSON.stringify(nftMetaData)).toString("base64"),
            });

            // Upload the NFT metadata to IPFS
            await metaDataFile.saveIPFS();
            const metaDataFileUrl = metaDataFile.ipfs();

            // Get the metadata hash ID from IPFS
            const metaDataFileId = metaDataFileUrl.split("/")[4];

            // 9. New url to access the metadata file
            const metaDataGatewayFileUrlAddress = `${moralisGateWayIPFAddress}/${metaDataFileId}`;

            // Connect to Smart Contract
            setmintingStatus("Minting your NFT...");
            const nftMinterContract = new web3.eth.Contract(
                contractABI,
                contractAddress
            );


            // Mint the NFT using the mintToken function in the smart contract
            const nftMintResponse = await nftMinterContract.methods
                .mintToken(metaDataGatewayFileUrlAddress)
                .send({ from: user.get("ethAddress") });

            // Get the minted NFT address from the response
            const nftAddress = nftMintResponse.events.Transfer.address;
            const nftTokenId = nftMintResponse.events.Transfer.returnValues.tokenId;

            // Set the minted NFT address
            setNftAddress(`${nftAddress}/${nftTokenId}`);
            setisminted(true);
            setisMinting(false);
        } catch (error) {
            console.log(error);
            alert(error.message);
            setisMinting(false);
        }
    };

    //   Display the success page when the minting is set to True
    if (isminted) {
        return (
            <React.Fragment>
                <Success setisminted={setisminted} nftAddress={nftAddress} />
            </React.Fragment>
        );
    }

    const fetchImg = () => {
        // this.setState({ image: null });
        setGeneratingAiImage(true);
        setImage(null);
        fetch('https://dalle-mini.amasad.repl.co/gen/' + ai_image_prompt)
            .then(response => response.blob())
            .then(image => {
                setRawImage(image);
                setImage(URL.createObjectURL(image));
                setHideMinter(false);
                setGeneratingAiImage(false);
                // this.setState({ image });
            });
    }

    return (
        <section className='nft-minting-section'>
            {isAuthenticated ? (
                <React.Fragment>
                    {/* Minting Form */}
                    <section className='page-hero'>
                        <h2 className='hero-title text-style'>NFTrify Me</h2>
                        <h5 className='hero-title' style={{ fontSize: "30px", color: "white" }}>AI Generated NFTs For Anyone</h5>
                    </section>
                    <section className='form-wrapper'>
                        <input
                            type='text'
                            onChange={(e) => setAiImagePrompt(e.target.value)}
                            className='form-control'
                            placeholder="Describe your NFT"
                            id='nft-image'
                            style={{
                                borderRadius: "14px"
                            }}
                        />
                        {generating_ai_img ? (
                            <button type='button' className='mint-btn' onClick={fetchImg}>
                                Getting Image...
                            </button>
                        ) :
                            <button type='button' className='mint-btn' onClick={fetchImg}>
                                Generate AI Image
                            </button>
                        }
                        {image &&
                            <>
                                <p
                                    style={{
                                        color: "white",
                                        fontSize: "20px",
                                        marginTop: "20px",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center"
                                    }}
                                >
                                    Description: {ai_image_prompt}
                                </p>
                                <img
                                    src={image}
                                    alt="AI Generated Image"
                                    style={{
                                        width: "50%",
                                        // center image
                                        marginLeft: "auto",
                                        marginRight: "auto",
                                        display: "block",
                                        marginTop: "20px",
                                        borderRadius: "14px"
                                    }}
                                />

                                {hide_minter === false &&
                                    <form>
                                        <div className='form-group'>
                                            <input
                                                type='text'
                                                className='form-control'
                                                id='nft-name'
                                                placeholder='Enter NFT Name'
                                                value={nftName}
                                                onChange={(e) => setnftName(e.target.value)}
                                                style={{
                                                    borderRadius: "14px"
                                                }}
                                            />
                                        </div>
                                        {/* Mint button */}
                                        <div className='form-group'>
                                            <button type='button' className='mint-btn' onClick={mintNft}>
                                                {isMinting ? mintingStatus : "Mint NFT"}
                                            </button>
                                        </div>
                                    </form>
                                }
                            </>
                        }
                    </section>
                </React.Fragment>
            ) : (
                <React.Fragment>
                    {/* Authentication Page */}
                    <section className='auth-section'>
                        <section className='page-hero'>
                            <h2 className='hero-title text-style'>NFTify Me</h2>
                        </section>
                        <ConnectWallet />
                    </section>
                </React.Fragment>
            )}
        </section>
    );
}
