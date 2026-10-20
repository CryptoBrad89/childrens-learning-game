'use strict';
if(!process.env.MASTER_HANDLE)throw new Error('Set MASTER_HANDLE to the live username read from Supabase; never rename the master for a test.');
module.exports={handle:process.env.MASTER_HANDLE,password:process.env.MASTER_PASSWORD||'ABCD1234'};
