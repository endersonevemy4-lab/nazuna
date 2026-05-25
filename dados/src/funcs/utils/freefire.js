/**
 * Free Fire Service - Implementação direta
 * Usa API hubsteam.com.br
 */

import axios from 'axios';

const BASE_URL = 'https://hubsteam.com.br';
const EXTERNAL_KEY = 'c95b81d2-8ebc-4af7-9ae8-8de9dd48fe6d';

/**
 * Buscar informações de um jogador de Free Fire
 * @param {string} playerId - ID do jogador (UID)
 * @returns {Promise<Object>} Informações do jogador
 */
async function getPlayerInfo(playerId) {
  try {
    if (!playerId || !/^\d+$/.test(String(playerId).trim())) {
      return { ok: false, msg: 'ID do jogador inválido. Deve conter apenas números.' };
    }

    const response = await axios.get(`${BASE_URL}/api/playerinfo`, {
      params: {
        id: playerId,
        key: EXTERNAL_KEY,
        region: 'BR'
      },
      timeout: 30000
    });

    const data = response.data;

    if (!data || data.error) {
      const errorMessages = {
        'player_not_found': 'Jogador não encontrado',
        'KEY_NOT_FOUND': 'Chave de API não encontrada',
        'KEY_INACTIVE': 'Chave de API desativada',
        'KEY_EXPIRED': 'Chave de API expirada',
      };
      return {
        ok: false,
        msg: errorMessages[data?.error] || data?.message || 'Jogador não encontrado'
      };
    }

    return {
      ok: true,
      player: data.player ?? data.name ?? data.nickname ?? 'Desconhecido',
      uid: data.uid ?? playerId,
      region: data.region ?? 'BR',
      level: data.level ?? '?',
      exp: data.exp ?? '?',
      likes: data.likes ?? data.initialLikes ?? '?',
      rank: data.rank ?? data.rankName ?? '?',
    };
  } catch (error) {
    console.error('[FreeFire] Erro ao buscar info:', error.message);
    return {
      ok: false,
      msg: error.code === 'ECONNABORTED'
        ? 'Tempo de espera excedido'
        : 'Erro ao conectar com o serviço Free Fire'
    };
  }
}

/**
 * Enviar likes para um jogador de Free Fire
 * @param {string} playerId - ID do jogador (UID)
 * @returns {Promise<Object>} Resultado do envio de likes
 */
async function sendLikes(playerId) {
  try {
    if (!EXTERNAL_KEY) {
      return { ok: false, msg: 'Chave da API de likes não configurada' };
    }

    if (!playerId || !/^\d+$/.test(String(playerId).trim())) {
      return { ok: false, msg: 'ID do jogador inválido. Deve conter apenas números.' };
    }

    console.log(`[FreeFire] Enviando likes para UID: ${playerId}`);

    const response = await axios.get(`${BASE_URL}/api/sendlikes`, {
      params: {
        id: playerId,
        key: EXTERNAL_KEY,
        region: 'BR'
      },
      timeout: 120000
    });

    const data = response.data;
    const wasSuccess = data.success === true && data.usageCounted === true;

    if (!wasSuccess) {
      const errorMessages = {
        'player_not_found': 'Jogador não encontrado',
        'INSUFFICIENT_LIKES': 'Menos de 100 likes foram enviados',
        'KEY_NOT_FOUND': 'Chave de API não encontrada',
        'KEY_INACTIVE': 'Chave de API desativada',
        'KEY_BLOCKED': 'Chave de API bloqueada',
        'KEY_EXPIRED': 'Chave de API expirada',
        'LIMIT_EXCEEDED': 'Limite diário excedido',
        'TOTAL_LIMIT_EXCEEDED': 'Limite total excedido'
      };

      return {
        ok: false,
        msg: errorMessages[data.error] || data.message || 'Erro ao enviar likes',
        data
      };
    }

    return {
      ok: true,
      player: data.player,
      uid: data.uid,
      region: data.region,
      initialLikes: data.initialLikes,
      finalLikes: data.finalLikes,
      likesAdded: data.likesAdded,
      level: data.level,
      exp: data.exp,
      status: data.status,
      timestamp: data.timestamp,
      usageCounted: data.usageCounted,
      keystats: data.keystats
    };
  } catch (error) {
    console.error('[FreeFire] Erro:', error.message);
    
    if (error.response?.data) {
      const data = error.response.data;
      return {
        ok: false,
        msg: data.message || 'Erro ao enviar likes',
        data
      };
    }

    return {
      ok: false,
      msg: error.code === 'ECONNABORTED' 
        ? 'Tempo de espera excedido' 
        : 'Erro ao conectar com o serviço de likes'
    };
  }
}

export default { sendLikes, getPlayerInfo };
export { sendLikes, getPlayerInfo };
