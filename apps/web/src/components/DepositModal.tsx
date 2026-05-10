import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

// The Token and Treasury from your environment variables
const PIGS_MINT = new PublicKey(import.meta.env.VITE_PIGS_TOKEN_MINT || '7cfmBSy6JEEh1Z9neHXGngpLQqZGRXZBf7aKu99Ppump');
const TREASURY_WALLET = new PublicKey(import.meta.env.VITE_TREASURY_WALLET || 'YOUR_PHANTOM_WALLET_ADDRESS');

interface Props {
  onClose: () => void;
}

export const DepositModal: React.FC<Props> = ({ onClose }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { refreshProfile } = useGameStore();
  
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SIGNING' | 'VERIFYING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return setError('Please connect your Solana wallet first.');
    
    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount <= 0) return setError('Enter a valid amount.');

    try {
      setStatus('SIGNING');
      setMessage('Approve the transaction in your wallet...');

      // 1. Get Token Accounts (Where the money is coming from and going to)
      const senderTokenAccount = await getAssociatedTokenAddress(PIGS_MINT, publicKey);
      const treasuryTokenAccount = await getAssociatedTokenAddress(PIGS_MINT, TREASURY_WALLET);

      // Check if the user actually has the token account
      try {
        await getAccount(connection, senderTokenAccount);
      } catch (e) {
        throw new Error('You do not have any $PIGS tokens in this wallet.');
      }

      // Convert amount to raw token decimals (Assuming 6 decimals for your token - adjust if different!)
      const DECIMALS = 6; 
      const rawAmount = depositAmount * Math.pow(10, DECIMALS);

      // 2. Build the Transfer Transaction
      const transaction = new Transaction().add(
        createTransferInstruction(
          senderTokenAccount,      // Source
          treasuryTokenAccount,    // Destination
          publicKey,               // Owner
          rawAmount                // Amount in smallest units
        )
      );

      // 3. Ask Wallet to Sign and Send
      const signature = await sendTransaction(transaction, connection);

      setStatus('VERIFYING');
      setMessage('Transaction sent! Waiting for blockchain confirmation...');

      // 4. Wait for the Solana network to confirm it
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed');

      // 5. Tell the Backend to verify the signature and give the user their In-Game Pigs
      setMessage('Confirmed! Crediting your game account...');
      await apiClient.post('/api/wallet/deposit', { signature, amount: depositAmount });

      await refreshProfile();
      setStatus('SUCCESS');
      setMessage(`Successfully deposited ${depositAmount} $PIGS!`);
      
      setTimeout(onClose, 3000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Transaction failed. Please try again.');
    }
  };

  const setError = (msg: string) => {
    setStatus('ERROR');
    setMessage(msg);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#1a1111', padding: 30, borderRadius: 16, width: '100%', maxWidth: 400, border: '2px solid #ff6b35' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#ff6b35', fontSize: 24, textTransform: 'uppercase' }}>Deposit $PIGS</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        {status === 'SUCCESS' ? (
          <div style={{ color: '#4caf50', textAlign: 'center', fontWeight: 'bold', fontSize: 18, padding: '20px 0' }}>{message}</div>
        ) : (
          <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
              Convert your Solana <strong>$PIGS</strong> into In-Game Pigs to purchase units and weapons. 1 $PIGS = 1 In-Game Pig.
            </p>

            <div>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 'bold' }}>AMOUNT TO DEPOSIT</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                disabled={status === 'SIGNING' || status === 'VERIFYING'}
                style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: 8, marginTop: 5, boxSizing: 'border-box', fontSize: 16 }}
              />
            </div>

            {status !== 'IDLE' && (
              <div style={{ color: status === 'ERROR' ? '#ff4d4f' : '#ffb300', fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>
                {message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={status === 'SIGNING' || status === 'VERIFYING'}
              style={{ padding: '15px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 900, cursor: (status === 'SIGNING' || status === 'VERIFYING') ? 'not-allowed' : 'pointer', marginTop: 10, fontSize: 16, textTransform: 'uppercase' }}
            >
              {status === 'SIGNING' ? 'CHECK WALLET...' : status === 'VERIFYING' ? 'VERIFYING...' : 'CONFIRM DEPOSIT'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
