export type Product = { id:string; brand:string; name:string; price:number; size:string; image:string; short:string; description:string; benefits:string[]; usage:string };
export type Delivery = { desk:number; home:number };
export type Order = {
  id:string; source:"cosmetics"|"lens"; status:string; createdAt:string;
  customerName:string; phone:string; wilaya:string; address:string;
  productId:string; productName:string; productBrand?:string; unitPrice:number;
  quantity:number; delivery?:string; shipping?:number; total:number;
};

const API_KEY="AIzaSyAoZ_T9UcSmOQ1aj7213IFVdFDWe8x9CxA";
const BASE="https://firestore.googleapis.com/v1/projects/lens-16470/databases/(default)/documents";
const AUTH="https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";
const SESSION="lens_admin_session";
type FireValue=Record<string,unknown>;
type FireDoc={name?:string;fields?:Record<string,FireValue>};

function toValue(value:unknown):FireValue{
  if(value===null||value===undefined)return{nullValue:null};
  if(typeof value==="string")return{stringValue:value};
  if(typeof value==="boolean")return{booleanValue:value};
  if(typeof value==="number")return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};
  if(value instanceof Date)return{timestampValue:value.toISOString()};
  if(Array.isArray(value))return{arrayValue:{values:value.map(toValue)}};
  return{mapValue:{fields:Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([k,v])=>[k,toValue(v)]))}};
}
function fromValue(value:FireValue):unknown{
  if("stringValue" in value)return value.stringValue;
  if("integerValue" in value)return Number(value.integerValue);
  if("doubleValue" in value)return Number(value.doubleValue);
  if("booleanValue" in value)return value.booleanValue;
  if("timestampValue" in value)return value.timestampValue;
  if("nullValue" in value)return null;
  if("arrayValue" in value)return((value.arrayValue as{values?:FireValue[]}).values??[]).map(fromValue);
  if("mapValue" in value)return fromFields((value.mapValue as FireDoc).fields??{});
  return undefined;
}
function fromFields(fields:Record<string,FireValue>){return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,fromValue(v)]));}
function body(data:Record<string,unknown>){return{fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,toValue(v)]))};}
function token(){return JSON.parse(sessionStorage.getItem(SESSION)||"null")?.idToken as string|undefined;}
async function request(path:string,init:RequestInit={}){
  const idToken=token(); if(!idToken)throw new Error("Session expirée. Reconnectez-vous.");
  const response=await fetch(`${BASE}/${path}${path.includes("?")?"&":"?"}key=${API_KEY}`,{...init,headers:{"Content-Type":"application/json",Authorization:`Bearer ${idToken}`,...init.headers}});
  if(response.status===401||response.status===403){sessionStorage.removeItem(SESSION);throw new Error("Session expirée. Reconnectez-vous.");}
  if(!response.ok)throw new Error("Firebase a refusé l’opération.");
  return response.status===204?null:response.json();
}
export function isSignedIn(){return Boolean(token());}
export function logout(){sessionStorage.removeItem(SESSION);}
export async function signIn(email:string,password:string){
  const response=await fetch(`${AUTH}?key=${API_KEY}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})});
  if(!response.ok)throw new Error("E-mail ou mot de passe incorrect.");
  const session=await response.json();sessionStorage.setItem(SESSION,JSON.stringify(session));return session;
}
export async function getCatalog(){const doc=await request("catalog/cosmetics") as FireDoc;return((fromFields(doc.fields??{}) as{products?:Product[]}).products??[]);}
export async function saveCatalog(products:Product[]){await request("catalog/cosmetics",{method:"PATCH",body:JSON.stringify(body({products,updatedAt:new Date()}))});}
export async function getDelivery(){const doc=await request("settings/delivery") as FireDoc;const value=fromFields(doc.fields??{}) as Delivery;return{desk:value.desk||450,home:value.home||700};}
export async function saveDelivery(delivery:Delivery){await request("settings/delivery",{method:"PATCH",body:JSON.stringify(body({...delivery,updatedAt:new Date()}))});}
export async function getOrders(){
  const data=await request("orders?pageSize=100&orderBy=createdAt%20desc") as{documents?:FireDoc[]};
  return(data.documents??[]).map(doc=>({...fromFields(doc.fields??{}),id:doc.name?.split("/").pop()||""} as Order));
}
export async function updateOrderStatus(id:string,status:string){
  await request(`orders/${encodeURIComponent(id)}?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt`,{method:"PATCH",body:JSON.stringify(body({status,updatedAt:new Date()}))});
}
