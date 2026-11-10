import {createClient,SupabaseClient} from '@supabase/supabase-js';
export const defaultConfig={url:'https://mwxqxmkmqhxkkeuqbryv.supabase.co',key:'sb_publishable_Mm8ZJmmzxoCwGlnyyyWkuA_hUkyibA7'};
let cachedClient:SupabaseClient|null=null;let cachedConfig='';
export function getCloudClient(url?:string,key?:string){if(!url&&!key&&cachedClient)return cachedClient;url??=defaultConfig.url;key??=defaultConfig.key;const signature=url+'|'+key;if(!cachedClient||cachedConfig!==signature){cachedClient?.auth.stopAutoRefresh();cachedClient=createClient(url,key);cachedConfig=signature}return cachedClient}
