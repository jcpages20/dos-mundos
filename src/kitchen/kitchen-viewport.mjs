// Lock both the game document and its host while the kitchen is open. Keep
// browser chrome resizes out of an active gesture, then restore every style.
export class KitchenViewport {
  constructor(root,onRotate){
    this.root=root;this.onRotate=onRotate;this.abort=new AbortController();this.undo=[];this.views=[window];
    try{if(parent!==window&&parent.document)this.views.push(parent);}catch{/* A standalone kitchen also works. */}
    const host=this.views[this.views.length-1];if(host.CSS?.supports('height','100svh')){this.probe=host.document.createElement('i');this.probe.setAttribute('aria-hidden','true');this.probe.style.cssText='position:fixed;top:0;left:0;width:0;height:100svh;padding:0;margin:0;border:0;visibility:hidden;pointer-events:none';host.document.documentElement.append(this.probe);}
    for(const view of this.views){
      const {document:doc}=view,x=view.scrollX,y=view.scrollY;
      const change=(node,values)=>{const old=Object.keys(values).map(key=>[key,node.style.getPropertyValue(key),node.style.getPropertyPriority(key)]);for(const [key,value] of Object.entries(values))node.style.setProperty(key,value);this.undo.push(()=>{for(const [key,value,priority] of old){if(value)node.style.setProperty(key,value,priority);else node.style.removeProperty(key);}});};
      this.undo.push(()=>{try{view.scrollTo({left:x,top:y,behavior:'instant'});}catch{view.scrollTo(x,y);}});
      change(doc.documentElement,{overflow:'hidden','overscroll-behavior':'none'});
      change(doc.body,{position:'fixed',top:-y+'px',left:-x+'px',width:'100%',height:'100%',overflow:'hidden','overscroll-behavior':'none'});
      const options={signal:this.abort.signal};view.addEventListener('resize',()=>this.resize(),options);view.visualViewport?.addEventListener('resize',()=>this.resize(),options);
    }
    this.resize();
  }
  resize(){
    const width=window.innerWidth,stable=this.probe?.getBoundingClientRect().height||Infinity,height=Math.min(stable,...this.views.map(view=>Math.min(view.innerHeight,view.visualViewport?.height||view.innerHeight)));
    if(!this.width||Math.abs(width-this.width)>1){
      const held=this.holding;this.holding=false;this.pending=null;if(held)this.onRotate?.();this.apply(width,height);
    }else if(height<this.height-1){if(this.holding)this.pending={width,height};else this.apply(width,height);}
    // Growing browser chrome space never stretches or recenters the board.
  }
  apply(width,height){this.width=width;this.height=height;this.root.style.setProperty('--ck-height',height+'px');this.root.dataset.layout=width>=600&&width>height?'landscape':'portrait';}
  beginGesture(){this.holding=true;}
  endGesture(){this.holding=false;const pending=this.pending;this.pending=null;if(pending)this.apply(pending.width,pending.height);}
  destroy(){if(this.destroyed)return;this.destroyed=true;this.abort.abort();this.probe?.remove();for(const undo of this.undo.reverse())undo();this.undo=[];}
}
