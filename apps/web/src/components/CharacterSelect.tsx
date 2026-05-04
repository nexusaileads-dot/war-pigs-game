import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

type CharacterDetails = {
  characterId: string;
  name: string;
  classType: string;
  description?: string | null;
  upgradeLevel?: number | null;
};

type InventoryItem = {
  id: string;
  type: 'CHARACTER' | 'WEAPON';
  acquiredAt?: string;
  timesUsed?: number;
  details: CharacterDetails;
};

type CharacterMeta = {
  icon: string;
  classIcon: string;
  powerName: string;
  baseCooldown: number;
  effect: string;
  upgradeFocus: string;
  health: number;
  speedLabel: string;
  speedValue: number;
  maxLevel: number;
};

const MAX_CHARACTER_LEVEL = 5;

// NOTE: Stats must match GameScene.ts applyCharacterUpgrades() and backend validation
const CHARACTER_META: Record<string, CharacterMeta> = {
  grunt_bacon: {
    icon: 'Grunt-Bacon.png', classIcon: 'assault.png', powerName: 'Mud Slow', baseCooldown: 6,
    effect: 'Slows nearby enemies for a short duration.', upgradeFocus: 'Slow strength, radius, and duration',
    health: 100, speedLabel: 'Balanced', speedValue: 245, maxLevel: MAX_CHARACTER_LEVEL
  },
  iron_tusk: {
    icon: 'Iron-Tusk.png', classIcon: 'tank.png', powerName: 'Iron Slam', baseCooldown: 7,
    effect: 'Shockwave push that damages enemies around the unit.', upgradeFocus: 'Shockwave damage, knockback, and radius',
    health: 160, speedLabel: 'Slow', speedValue: 205, maxLevel: MAX_CHARACTER_LEVEL
  },
  swift_hoof: {
    icon: 'Swift-Hoof.png', classIcon: 'scout.png', powerName: 'Scout Dash', baseCooldown: 4.5,
    effect: 'Fast mobility burst for repositioning.', upgradeFocus: 'Dash distance, speed, and cooldown',
    health: 85, speedLabel: 'Very Fast', speedValue: 315, maxLevel: MAX_CHARACTER_LEVEL
  },
  precision_squeal: {
    icon: 'Precision-Squeal.png', classIcon: 'sniper.png', powerName: 'Focus Mode', baseCooldown: 7,
    effect: 'Boosts precision, projectile speed, damage, and pierce.', upgradeFocus: 'Damage bonus, pierce, duration, and cooldown',
    health: 90, speedLabel: 'Balanced', speedValue: 235, maxLevel: MAX_CHARACTER_LEVEL
  },
  blast_ham: {
    icon: 'Blast-Ham.png', classIcon: 'Demolition.png', powerName: 'Demolition Burst', baseCooldown: 6.5,
    effect: 'Fires explosive burst rockets toward enemies.', upgradeFocus: 'Rocket count, blast damage, radius, and cooldown',
    health: 115, speedLabel: 'Medium', speedValue: 225, maxLevel: MAX_CHARACTER_LEVEL
  },
  general_goldsnout: {
    icon: 'General-Goldsnout.png', classIcon: 'Elite.png', powerName: 'Rally Order', baseCooldown: 8,
    effect: 'Temporary combat efficiency boost.', upgradeFocus: 'Buff strength, duration, and cooldown',
    health: 125, speedLabel: 'Fast', speedValue: 270, maxLevel: MAX_CHARACTER_LEVEL
  }
};

const DEFAULT_META: CharacterMeta = {
  icon: 'Grunt-Bacon.png', classIcon: 'assault.png', powerName: 'Mud Slow', baseCooldown: 6,
  effect: 'Slows nearby enemies for a short duration.', upgradeFocus: 'Cooldown, radius, duration, and effect strength',
  health: 100, speedLabel: 'Balanced', speedValue: 245, maxLevel: MAX_CHARACTER_LEVEL
};

const getUpgradeCost = (level: number) => 200 + level * 150;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    return ((error as { response?: { data?: { error?: string } } }).response?.data?.error) || fallback;
  }
  return fallback;
};

export const CharacterSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({ onBack, onStart }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedCharacterId, setEquippedCharacterId] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradingCharacterId, setUpgradingCharacterId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { user, refreshProfile } = useGameStore();
  const currentPigs = user?.profile.currentPigs || 0;

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  const getMeta = useCallback((characterId: string) => CHARACTER_META[characterId] || DEFAULT_META, []);

  const loadInventory = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await apiClient.get('/api/inventory');
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      const characters = items.filter(
        (item: InventoryItem) => item.type === 'CHARACTER' && item.details?.characterId
      );

      setInventory(characters);
      const equippedId = res.data?.equipped?.characterId || characters[0]?.details.characterId || null;
      setEquippedCharacterId(equippedId);
      // Fixed: Prevent overriding explicit user selection during async fetch
      setSelectedCharacterId(prev => prev || equippedId);
    } catch (error) {
      console.error('[CharacterSelect] Failed to load inventory:', error);
      setLoadError('Failed to load unit inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadInventory(); }, [loadInventory]);

  const selectedCharacter = useMemo(
    () => inventory.find((item) => item.details.characterId === selectedCharacterId) || null,
    [inventory, selectedCharacterId]
  );

  const getCharacterImage = useCallback((characterId: string) => `/assets/sprites/${getMeta(characterId).icon}`, [getMeta]);

  const getClassIcon = useCallback((characterId: string, classType: string) => {
    const meta = getMeta(characterId);
    const fallbackClassMap: Record<string, string> = { ASSAULT: 'assault.png', TANK: 'tank.png', SNIPER: 'sniper.png', SCOUT: 'scout.png' };
    return `/assets/sprites/${meta.classIcon || fallbackClassMap[classType.toUpperCase()] || 'assault.png'}`;
  }, [getMeta]);

  const getCharacterStats = useCallback((character: InventoryItem) => {
    const meta = getMeta(character.details.characterId);
    const level = Math.max(0, Number(character.details.upgradeLevel ?? 0));
    // Fixed: Aligned speed increment (+8) with GameScene.ts applyCharacterUpgrades()
    // Fixed: Cooldown reduction (0.35s) matches GameScene.ts logic
    return {
      level,
      health: meta.health + level * 10,
      speedValue: meta.speedValue + level * 8,
      speedLabel: meta.speedLabel,
      cooldown: `${Math.max(2.2, meta.baseCooldown - level * 0.35).toFixed(1)}s`,
      powerName: meta.powerName,
      effect: meta.effect,
      upgradeFocus: meta.upgradeFocus,
      maxLevel: meta.maxLevel
    };
  }, [getMeta]);

  const selectedStats = useMemo(
    () => (selectedCharacter ? getCharacterStats(selectedCharacter) : null),
    [selectedCharacter, getCharacterStats]
  );

  const confirmSelection = async () => {
    if (!selectedCharacterId) return showNotification('Select a unit first.', 'error');
    try {
      setIsSubmitting(true);
      await apiClient.post('/api/inventory/equip', { characterId: selectedCharacterId });
      await refreshProfile();
      setEquippedCharacterId(selectedCharacterId);
      showNotification('Unit equipped successfully.', 'success');
      onStart();
    } catch (error) {
      console.error('[CharacterSelect] Equip failed:', error);
      showNotification(getErrorMessage(error, 'Failed to equip unit.'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const upgradeCharacter = async (characterId: string) => {
    if (upgradingCharacterId) return;
    const item = inventory.find(i => i.details.characterId === characterId);
    if (!item) return;

    const currentLevel = Math.max(0, Number(item.details.upgradeLevel ?? 0));
    const cost = getUpgradeCost(currentLevel);
    if (currentLevel >= MAX_CHARACTER_LEVEL) return;
    // Fixed: Pre-flight validation prevents wasted API calls
    if (currentPigs < cost) return showNotification('Insufficient Pigs for upgrade.', 'error');

    try {
      setUpgradingCharacterId(characterId);
      await apiClient.post('/api/inventory/upgrade-character', { characterId, cost });
      await Promise.all([loadInventory(), refreshProfile()]);
      setSelectedCharacterId(characterId);
      showNotification('Unit upgraded.', 'success');
    } catch (error) {
      console.error('[CharacterSelect] Upgrade failed:', error);
      showNotification(getErrorMessage(error, 'Unit upgrade failed.'), 'error');
    } finally {
      setUpgradingCharacterId(null);
    }
  };

  // --- Render States ---
  if (isLoading) return <div style={containerStyle}><div style={centerStyle}>LOADING UNITS...</div></div>;
  if (loadError) return (<div style={containerStyle}><button onClick={onBack} style={backButtonStyle}>BACK</button><div style={errorBoxStyle}>{loadError}</div></div>);
  if (inventory.length === 0) return (<div style={containerStyle}><button onClick={onBack} style={{...backButtonStyle, alignSelf:'flex-start'}}>BACK</button><div style={cardStyle}><h2 style={{marginTop:0, color:'#ff6b35'}}>No Units Available</h2><p style={{color:'#bbb',margin:0}}>Your inventory has no character units yet. Buy one in the shop first.</p></div></div>);

  // --- Main UI ---
  return (
    <div style={containerStyle}>
      {notification && (
        <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', background: notification.type==='error'?'#8b2e2e':'#2e7d32', color:'#fff', padding:'10px 20px', borderRadius:8, zIndex:9999, fontWeight:700 }}>
          {notification.message}
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:18 }}>
        <button onClick={onBack} style={backButtonStyle}>BACK</button>
        <h2 style={{ textAlign:'center', color:'#ff6b35', margin:0, textTransform:'uppercase' }}>Units</h2>
        <div style={{ minWidth:92, display:'flex', justifyContent:'flex-end', alignItems:'center', gap:6, color:'#ffd700', fontWeight:800 }}>
          <img src="/assets/sprites/pig-token.png" style={{width:18, height:18, objectFit:'contain'}} alt="" />{currentPigs}
        </div>
      </div>

      {selectedCharacter && selectedStats ? (
        <div style={selectionCardStyle}>
          <div style={imageBoxStyle}><img src={getCharacterImage(selectedCharacter.details.characterId)} alt={selectedCharacter.details.name} style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}} onError={e => e.currentTarget.style.display='none'} /></div>
          <div style={{flex:1, minWidth:220}}>
            <div style={{fontSize:12, color:'#888', marginBottom:4}}>CURRENT UNIT</div>
            <div style={{fontSize:22, fontWeight:900, color:'#fff'}}>{selectedCharacter.details.name}</div>
            <div style={{color:'#ffb74d', fontWeight:800, marginTop:4}}>{selectedCharacter.details.classType} · LVL {selectedStats.level}/{selectedStats.maxLevel}</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(105px, 1fr))', gap:8, marginTop:10}}>
              <SpecPill label="Health" value={selectedStats.health} />
              <SpecPill label="Speed" value={`${selectedStats.speedLabel} (${selectedStats.speedValue})`} />
              <SpecPill label="Power" value={selectedStats.powerName} />
              <SpecPill label="Cooldown" value={selectedStats.cooldown} />
            </div>
            <div style={{color:'#9be38f', fontSize:12, marginTop:10, fontWeight:700}}>Effect: {selectedStats.effect}</div>
            <div style={{color:'#8fcfff', fontSize:12, marginTop:6, fontWeight:700}}>Upgrade Path: {selectedStats.upgradeFocus}</div>
            {selectedCharacter.details.description && <div style={{color:'#bbb', fontSize:13, marginTop:8}}>{selectedCharacter.details.description}</div>}
          </div>
          <div style={imageBoxSmall}><img src={getClassIcon(selectedCharacter.details.characterId, selectedCharacter.details.classType)} alt={selectedCharacter.details.classType} style={{width:38, height:38, objectFit:'contain'}} onError={e => e.currentTarget.src='/assets/sprites/assault.png'} /></div>
        </div>
      ) : null}

      <div style={{display:'flex', flexDirection:'column', gap:12, marginBottom:20}}>
        {inventory.map(item => {
          const cid = item.details.characterId;
          const stats = getCharacterStats(item);
          const isSelected = selectedCharacterId === cid;
          const isEquipped = equippedCharacterId === cid;
          const isMaxed = stats.level >= stats.maxLevel;
          const cost = getUpgradeCost(stats.level);
          const canAfford = currentPigs >= cost;
          const isUpgrading = upgradingCharacterId === cid;

          return (
            <div key={cid} style={{ background: isSelected ? '#2a1b14' : '#222', padding:14, borderRadius:12, display:'flex', alignItems:'center', gap:14, border:`2px solid ${isSelected ? '#ff6b35' : '#333'}`, color:'#fff', boxShadow: isSelected ? '0 8px 20px rgba(255,107,53,0.18)' : 'none' }}>
              <button type="button" onClick={() => setSelectedCharacterId(cid)} style={thumbButtonStyle}><img src={getCharacterImage(cid)} alt={item.details.name} style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}} onError={e => e.currentTarget.src='/assets/sprites/Grunt-Bacon.png'} /></button>
              <button type="button" onClick={() => setSelectedCharacterId(cid)} style={infoButtonStyle}>
                <h3 style={{margin:'0 0 5px 0', fontSize:19, color:'#fff'}}>{item.details.name}</h3>
                <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom:6, color:'#888', fontWeight:'bold', fontSize:12}}><span>CLASS: {item.details.classType}</span><span>HP: {stats.health}</span><span>LVL: {stats.level}/{stats.maxLevel}</span></div>
                <div style={{color:'#ffb74d', fontSize:12, fontWeight:700, marginBottom:4}}>POWER: {stats.powerName} · CD: {stats.cooldown}</div>
                <div style={{color:'#8fcfff', fontSize:12, fontWeight:700}}>Upgrade: {stats.upgradeFocus}</div>
                <p style={{margin:'6px 0 0 0', color:'#777', fontSize:11}}>Used {item.timesUsed ?? 0} time{item.timesUsed === 1 ? '' : 's'}</p>
              </button>
              <div style={{display:'flex', flexDirection:'column', gap:7, alignItems:'flex-end', flexShrink:0}}>
                {isEquipped && <Tag color="#4caf50" text="EQUIPPED" />}
                {isSelected && <Tag color="#ff6b35" text="SELECTED" />}
                <button type="button" disabled={isMaxed || !canAfford || isUpgrading} onClick={() => void upgradeCharacter(cid)} style={{ padding:'8px 10px', borderRadius:8, border:'none', background: isMaxed?'#2e7d32':!canAfford||isUpgrading?'#555':'#ff6b35', color:'#fff', fontWeight:900, fontSize:11, cursor: isMaxed||!canAfford||isUpgrading?'not-allowed':'pointer', whiteSpace:'nowrap' }}>{isMaxed?'MAXED':isUpgrading?'UPGRADING...':`UPGRADE ${cost}`}</button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => void confirmSelection()} disabled={!selectedCharacterId || isSubmitting} style={{ padding:'14px 20px', background:!selectedCharacterId||isSubmitting?'#555':'#ff6b35', border:'none', color:'#fff', borderRadius:10, cursor:!selectedCharacterId||isSubmitting?'not-allowed':'pointer', fontWeight:'bold', textTransform:'uppercase', letterSpacing:1, marginTop:'auto' }}>
        {isSubmitting ? 'EQUIPPING...' : 'CONFIRM LOADOUT'}
      </button>
    </div>
  );
};

const SpecPill: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div style={{background:'#222', border:'1px solid #333', borderRadius:8, padding:'8px 10px'}}>
    <div style={{color:'#888', fontSize:10, textTransform:'uppercase', marginBottom:2, fontWeight:800}}>{label}</div>
    <div style={{color:'#fff', fontSize:12, fontWeight:900}}>{value}</div>
  </div>
);

const Tag: React.FC<{ color: string; text: string }> = ({ color, text }) => (
  <span style={{color, fontWeight:'bold', fontSize:11, whiteSpace:'nowrap'}}>{text}</span>
);

// --- Extracted Styles ---
const containerStyle: React.CSSProperties = { padding:20, color:'#fff', background:'#0a0a0a', display:'flex', flexDirection:'column', boxSizing:'border-box', minHeight:'100vh' };
const centerStyle: React.CSSProperties = { display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'#0a0a0a' };
const backButtonStyle: React.CSSProperties = { padding:'10px 20px', marginBottom:20, background:'#444', border:'2px solid #ff6b35', color:'#fff', borderRadius:8, cursor:'pointer', fontWeight:'bold' };
const errorBoxStyle: React.CSSProperties = { maxWidth:520, margin:'80px auto 0', padding:20, borderRadius:12, border:'2px solid #5a1f1f', background:'#1a1111', textAlign:'center', color:'#ff8a80' };
const cardStyle: React.CSSProperties = { maxWidth:560, margin:'80px auto 0', padding:22, background:'#151515', border:'2px solid #333', borderRadius:12, textAlign:'center' };
const selectionCardStyle: React.CSSProperties = { background:'#161616', border:'2px solid #ff6b35', borderRadius:14, padding:16, marginBottom:18, display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', boxShadow:'0 8px 22px rgba(255,107,53,0.12)' };
const imageBoxStyle: React.CSSProperties = { background:'#101010', padding:10, borderRadius:10, border:'1px solid #333', width:92, height:92, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };
const imageBoxSmall: React.CSSProperties = { background:'#101010', padding:10, borderRadius:10, border:'1px solid #333', width:62, height:62, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };
const thumbButtonStyle: React.CSSProperties = { background:'#111', padding:8, borderRadius:8, border:'1px solid #444', width:76, height:76, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' };
const infoButtonStyle: React.CSSProperties = { flex:1, minWidth:0, border:'none', background:'transparent', padding:0, color:'#fff', textAlign:'left', cursor:'pointer' };
