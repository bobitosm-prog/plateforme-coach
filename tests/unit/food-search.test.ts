import { describe, it, expect, vi } from 'vitest'
import { foodSearchTerms, searchFoodCatalog } from '@/lib/nutrition/food-search'

function database(fail = false) {
  const foods = [
    ...Array.from({length:40}, (_,i)=>({id:`beef-${i}`,name:`Boeuf ${i}`,source:'ANSES'})),
    {id:'egg',name:'Oeuf entier',source:'fitness'},
    {id:'white',name:"Blanc d'oeuf",source:'fitness'},
    {id:'omelette',name:'Omelette nature (2 oeufs)',source:'fitness'},
    {id:'fitness-beef',name:'Bavette de boeuf cuite',source:'fitness'},
    {id:'ligature',name:'Œuf dur',source:'ANSES'},
  ]
  return {from:vi.fn(()=>{
    let source:string|undefined, term='', limit=30
    const chain:any={select:()=>chain,eq:(_:string,v:string)=>{source=v;return chain},ilike:(_:string,v:string)=>{term=v.replaceAll('%','').toLowerCase();return chain},order:()=>chain,limit:(v:number)=>{limit=v;return chain},abortSignal:()=>chain,
      then:(resolve:any)=>Promise.resolve({data:foods.filter(f=>(!source||f.source===source)&&f.name.toLowerCase().includes(term)).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,limit),error:fail?{message:'offline'}:null}).then(resolve)}
    return chain
  })}
}
describe('food catalog search',()=>{
  it.each(['oeuf','œuf','oeufs','œufs',' ŒUFS '])('finds fitness eggs before a saturated general catalog for %s',async query=>{
    const rows=await searchFoodCatalog(database(),query,new AbortController().signal)
    expect(rows[0].name).toBe('Oeuf entier')
    expect(rows.some(row=>row.name==="Blanc d'oeuf")).toBe(true)
    expect(rows.some(row=>row.name==='Œuf dur')).toBe(true)
    expect(new Set(rows.map(row=>row.id)).size).toBe(rows.length)
  })
  it('does not turn wildcard-only input into a catalog-wide search',async()=>{
    const db=database();expect(await searchFoodCatalog(db,'%_\\')).toEqual([]);expect(db.from).not.toHaveBeenCalled()
    expect(foodSearchTerms('avoine')).toEqual(['avoine'])
  })
  it('reports a catalog failure instead of hiding missing fitness results',async()=>{
    await expect(searchFoodCatalog(database(true),'oeuf')).rejects.toThrow('FOOD_SEARCH_FAILED')
  })
})
