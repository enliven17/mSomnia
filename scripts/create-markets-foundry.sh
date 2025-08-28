#!/bin/bash

# Load environment variables
source .env

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not found in .env file"
    exit 1
fi

echo "🚀 Creating remaining markets on Somnia Testnet..."
echo "📝 Using private key: ${PRIVATE_KEY:0:10}..."

# Contract address
CONTRACT_ADDRESS="0xc0b33Cc720025dD0AcF56e249C8b76A6A34170B6"

# Market 5: Cat as DAO CEO
echo "🐱 Creating Market 5: Cat as DAO CEO..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will a cat become the CEO of a DAO in 2024? 😸" "Dogs have their day, but cats are taking over the decentralized world" $(($(date +%s) + 180*24*60*60))

# Market 6: Proof of Sleep Blockchain
echo "😴 Creating Market 6: Proof of Sleep Blockchain..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will someone create a 'Proof of Sleep' blockchain? 😴" "The most energy-efficient consensus mechanism - you literally sleep to mine" $(($(date +%s) + 120*24*60*60))

# Market 7: WAGMI in Presidential Speech
echo "🗣️ Creating Market 7: WAGMI in Presidential Speech..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will 'WAGMI' be used in a presidential speech in 2024? 🗣️" "We're All Gonna Make It - but will politicians finally understand crypto slang?" $(($(date +%s) + 60*24*60*60))

# Market 8: Proof of Meme Consensus
echo "🎭 Creating Market 8: Proof of Meme Consensus..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will someone create a 'Proof of Meme' consensus mechanism? 🎭" "The blockchain that runs on pure comedy - the more you laugh, the more you earn" $(($(date +%s) + 200*24*60*60))

# Market 9: Diamond Hands Medical Condition
echo "💎 Creating Market 9: Diamond Hands Medical Condition..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will 'Diamond Hands' become a medical condition in 2024? 💎" "Doctors finally recognize the psychological effects of never selling" $(($(date +%s) + 90*24*60*60))

# Market 10: Proof of Coffee Blockchain
echo "☕ Creating Market 10: Proof of Coffee Blockchain..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will someone create a 'Proof of Coffee' blockchain? ☕" "The most caffeinated consensus mechanism - your morning coffee powers the network" $(($(date +%s) + 150*24*60*60))

# Market 11: FOMO as Psychological Disorder
echo "😱 Creating Market 11: FOMO as Psychological Disorder..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will 'FOMO' be officially recognized as a psychological disorder? 😱" "The Fear Of Missing Out - finally gets the medical recognition it deserves" $(($(date +%s) + 365*24*60*60))

# Market 12: Proof of Dance Blockchain
echo "💃 Creating Market 12: Proof of Dance Blockchain..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will someone create a 'Proof of Dance' blockchain? 💃" "Move to earn - the most entertaining way to validate transactions" $(($(date +%s) + 120*24*60*60))

# Market 13: Paper Hands Therapy
echo "📄 Creating Market 13: Paper Hands Therapy..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will 'Paper Hands' become a psychological therapy technique? 📄" "Therapists start using 'paper hands' as a metaphor for letting go" $(($(date +%s) + 180*24*60*60))

# Market 14: Proof of Pizza Blockchain
echo "🍕 Creating Market 14: Proof of Pizza Blockchain..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will someone create a 'Proof of Pizza' blockchain? 🍕" "The tastiest consensus mechanism - you earn tokens by eating pizza" $(($(date +%s) + 90*24*60*60))

# Market 15: Ape In Financial Advice
echo "🦍 Creating Market 15: Ape In Financial Advice..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will 'Ape In' become a financial advisor's official recommendation? 🦍" "Professional financial planners start using crypto slang in their advice" $(($(date +%s) + 120*24*60*60))

# Market 16: Proof of Laughter Blockchain
echo "😂 Creating Market 16: Proof of Laughter Blockchain..."
cast send --rpc-url https://dream-rpc.somnia.network --private-key $PRIVATE_KEY $CONTRACT_ADDRESS "createMarket(string,string,uint256)" "Will someone create a 'Proof of Laughter' blockchain? 😂" "The happiest blockchain - your joy powers the network and spreads positivity" $(($(date +%s) + 200*24*60*60))

echo "🎉 All markets created successfully!"
echo "📊 Total markets: 16"
echo "🌐 Contract: $CONTRACT_ADDRESS"
echo "🔗 Explorer: https://shannon-explorer.somnia.network/address/$CONTRACT_ADDRESS"

