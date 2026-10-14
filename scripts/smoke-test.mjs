import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const client = new Client({name: 'portfolio-audit', version:'1.0.0'});
const transport = new StdioClientTransport({command:'node', args:['dist/index.js']});
try {
 await client.connect(transport);
 const tools = await client.listTools();
 if (!tools.tools.some(t=>t.name==='list_accounts')) throw new Error('list_accounts missing');
 const result = await client.callTool({name:'list_accounts', arguments:{}});
 if (result.isError) throw new Error('list_accounts failed');
 const payload=result.content.find(c=>c.type==='text')?.text;
 if(!payload || !payload.includes('acc_001')) throw new Error('Seed account missing');
 console.log(JSON.stringify({build:'passed',mcp_connection:'passed',tool_count:tools.tools.length,list_accounts:'passed'}));
} finally {await client.close();}
