import{Fh as O,Gh as P,Hh as h,Od as K,Va as r,Vd as Q,Yh as X,b as V,wd as Y}from"/js/chunks/chunk-DBPWDLZD.js";import{b as M}from"/js/chunks/chunk-KVCGO4KM.js";import{a as m,b as C,c as x,d as q,f as D,g as W,h as G,i as w,j as F,k as _,l as z,m as j,o as f,q as k,s as J,t as S}from"/js/chunks/chunk-UP7TK6FA.js";function A(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function me(e){return`<div class="clinical-onboarding-progress" aria-label="Progreso del registro">${["Modo","Perfil","Equipo"].map((t,o)=>{let i=o+1;return`<span class="${(i===e?" is-active":"").trim()}" title="${A(t)}" aria-label="${A(t)}">${i}</span>`}).join("")}</div>`}function I({title:e,leadHtml:n,bodyHtml:a,stepperIndex:t=null}){return`
    <div class="clinical-onboarding-stage">
      <div class="clinical-onboarding-stage-inner">
        ${t!=null?me(t):""}
        <h3 class="clinical-onboarding-title">${A(e)}</h3>
        <div class="clinical-onboarding-lead">${n}</div>
        ${a}
      </div>
    </div>`}var fe='<svg class="clinical-onboard-mode-card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>',pe='<svg class="clinical-onboard-mode-card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>';function Z(){return`
        <div class="clinical-onboard-mode-grid" role="group" aria-label="Modo de uso">
          <button type="button" class="clinical-onboard-mode-card clinical-onboard-mode-card--primary" data-sync-mode="lan">
            <span class="clinical-onboard-mode-card-head">
              ${fe}
              <span class="clinical-onboard-mode-card-title">Guardia en red (LAN)</span>
            </span>
            <span class="clinical-onboard-mode-card-desc">Usuario @usuario, sala, sincronizaci\xF3n en vivo con el equipo y <strong>Mi rotaci\xF3n</strong>.</span>
          </button>
          <button type="button" class="clinical-onboard-mode-card" data-sync-mode="local">
            <span class="clinical-onboard-mode-card-head">
              ${pe}
              <span class="clinical-onboard-mode-card-title">Solo este equipo</span>
            </span>
            <span class="clinical-onboard-mode-card-desc">Sin LAN ni LiveSync: expedientes y notas solo en esta Mac. Sin rotaciones ni sala compartida.</span>
          </button>
        </div>`}function ge(){return typeof window>"u"?null:window.rplusDb||window.electronAPI||null}function ee(e,n="info"){typeof window<"u"&&typeof window.showToast=="function"&&window.showToast(e,n)}function be(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function ye(e){return be(e).replace(/"/g,"&quot;")}function he(e){return`local_${String(e||"").replace(/[^a-z0-9]/gi,"").toLowerCase().slice(-10)||"device"}`.slice(0,32)}function U(e){e.innerHTML=I({title:"\xBFC\xF3mo usar\xE1s R+?",leadHtml:"<p>Elige antes de configurar tu perfil. La elecci\xF3n queda guardada en este equipo.</p>",bodyHtml:Z(),stepperIndex:1})}function ne(e,n){let a=String(n.clinicalRank||r.user?.rank||"R1"),t=String(n.clinicalDisplayName||r.user?.clinical_name||"");e.innerHTML=I({title:"Perfil local",leadHtml:"<p>R+ no usar\xE1 red de guardia. Solo necesitamos c\xF3mo firmar notas y documentos en esta Mac.</p>",stepperIndex:2,bodyHtml:`
      <div class="clinical-onboard-form-shell clinical-onboard-form-shell--narrow">
        <form id="clinical-onboard-local-form" class="clinical-teams-create-form clinical-onboard-form clinical-onboard-form--local">
          <div class="field-group">
            <label for="onboard-local-name">Tu nombre en notas *</label>
            <input id="onboard-local-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
              value="${ye(t)}" required autocomplete="name">
          </div>
          <div class="field-group">
            <label for="onboard-local-rank">Rango (opcional)</label>
            <select id="onboard-local-rank" class="profile-input">
              <option value="R1" ${a==="R1"?"selected":""}>R1</option>
              <option value="R2" ${a==="R2"?"selected":""}>R2</option>
              <option value="R3" ${a==="R3"?"selected":""}>R3</option>
              <option value="R4" ${a==="R4"?"selected":""}>R4</option>
            </select>
          </div>
          <p id="onboard-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="btn-save">Continuar sin LAN</button>
            <button type="button" id="clinical-onboard-back-mode" class="btn-med-secondary">Cambiar modo</button>
          </div>
        </form>
      </div>`})}async function B(){let{refreshMainClinicalOnboardingIfNeeded:e}=await import("/js/chunks/clinical-onboarding-main-IJFKI6US.js");await e()}async function Ce(e){if(e==="local")_(!0);else if(e==="lan")_(!1);else return;await B()}async function ve(){let e=f();delete e.clinicalLocalOnly;try{localStorage.setItem("rpc-settings",JSON.stringify(e))}catch{}await B()}async function we(e){e.preventDefault();let n=String(document.getElementById("onboard-local-name")?.value||"").trim(),a=String(document.getElementById("onboard-local-rank")?.value||"R1"),t=document.getElementById("onboard-error");if(!n){t&&(t.textContent="Escribe c\xF3mo quieres aparecer en notas y documentos.",t.hidden=!1);return}let o=ge(),i=String(r.user?.user_id||"");if(!i||!o){ee("Sesi\xF3n cl\xEDnica no disponible.","error");return}let s=he(i);if(m(r.user?.username||"")!==s&&typeof o.dbClinicalUsernameClaim=="function"){let l=await o.dbClinicalUsernameClaim({userId:i,username:s});if(!l?.ok&&!/ya está en uso/i.test(String(l?.error||""))){t&&(t.textContent=l?.error||"No se pudo guardar el perfil local.",t.hidden=!1);return}l?.ok&&r.user&&(r.user.username=s)}if(typeof o.dbClinicalProfileUpsert=="function"){let l=await o.dbClinicalProfileUpsert({userId:i,clinicalName:n,rank:a,sala:null,isProgramAdmin:!1});if(!l?.ok){t&&(t.textContent=l?.error||"No se guard\xF3 el perfil.",t.hidden=!1);return}r.user&&(r.user.rank=a,r.user.clinical_name=n,r.user.sala=null,r.user.is_program_admin=0)}S({userId:i,username:s,displayName:n,rank:a,sala:"",registered:!0,lanProfileGateComplete:!0,isProgramAdmin:!1}),_(!0),t&&(t.hidden=!0),await h(),document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed")),ee("Listo. R+ queda solo en este equipo, sin sincronizaci\xF3n LAN.","success"),await B()}function ie(){let e=document.querySelector(".clinical-onboard-mode-grid");e&&!e._rpcModeWired&&(e._rpcModeWired=!0,e.addEventListener("click",t=>{let o=t.target.closest("[data-sync-mode]");o&&Ce(String(o.getAttribute("data-sync-mode")||""))}));let n=document.getElementById("clinical-onboard-local-form");n&&!n._rpcLocalWired&&(n._rpcLocalWired=!0,n.addEventListener("submit",t=>void we(t)));let a=document.getElementById("clinical-onboard-back-mode");a&&!a._rpcBackModeWired&&(a._rpcBackModeWired=!0,a.addEventListener("click",()=>void ve()))}function ae(){return typeof window>"u"?null:window.rplusDb||window.electronAPI||null}function p(e,n="info"){typeof window<"u"&&typeof window.showToast=="function"&&window.showToast(e,n)}function v(){try{let e=JSON.parse(localStorage.getItem("rpc-settings")||"{}");return String(e.clientId||"")}catch{return""}}function re(){let e=r.user;if(!e?.user_id||x(e.username,v()))return!0;try{let a=JSON.parse(localStorage.getItem("rpc-settings")||"{}"),t=String(a.clinicalUsername||"").trim();if(t&&!C(m(t))||t&&x(e.username,v()))return!0}catch{}let n=m(e.username||"");return!C(n)}function je(){if(!r.user?.user_id)return!0;if(V(r.user))return!1;let e=r.teams||[];return K(e,r.user).length===0}function H(){if(!M())return!1;let e=f();return!(e.clinicalRegistered===!0||F(e))}function $(){if(!M())return!1;if(!r.user?.user_id||H())return!0;let e=f();return w(e)?e.clinicalRegistered!==!0?!0:!String(r.user?.clinical_name||"").trim():!!(k(e)||z(r.user?.username)||re()||!String(r.user?.clinical_name||"").trim()||!String(r.user?.sala||"").trim())}function Je(){return $()}function te(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function N(e){return te(e).replace(/"/g,"&quot;")}async function Se(e){e.preventDefault();let n=m(String(document.getElementById("onboard-username")?.value||"")),a=String(document.getElementById("onboard-clinical-name")?.value||"").trim(),t=String(document.getElementById("onboard-rank")?.value||"R1"),o=String(document.getElementById("onboard-sala")?.value||"").trim(),i=document.getElementById("onboard-error");if(!C(n)){i&&(i.textContent="Usuario LAN inv\xE1lido. Usa 3\u201332 letras min\xFAsculas (a-z, 0-9, _), p. ej. drmendoza \u2014 no tu nombre en guardia.",i.hidden=!1);return}if(!a){i&&(i.textContent="Escribe tu nombre en guardia.",i.hidden=!1);return}if(!o){i&&(i.textContent="Selecciona tu rotaci\xF3n.",i.hidden=!1);return}let s=f(),c=String(r.user?.user_id||""),l=ae();if(!c||!l){p("Sesi\xF3n cl\xEDnica no disponible.","error");return}let b=m(r.user?.username||""),d=q(b,n,v());if(d){let{assertLanRoomForUsernameRegister:u}=await import("/js/chunks/clinical-profile-lan-sync-E2KJNZBF.js");await u({sala:o})}if(d&&typeof l.dbClinicalUsernameClaim=="function"){let u=await l.dbClinicalUsernameClaim({userId:c,username:n});if(u?.ok)r.user&&(r.user.username=n);else{let y=String(u?.error||"");if(/ya está en uso/i.test(y))if(m(String(s.clinicalUsername||""))===n||window.confirm(`El usuario @${n} ya est\xE1 registrado en esta base de datos.

\xBFRecuperar tu cuenta en este dispositivo?`)){let T=await P(n,s,v());if(!T.ok){i&&(i.textContent=T.error||y,i.hidden=!1);return}c=String(r.user?.user_id||""),s=f()}else{i&&(i.textContent=y,i.hidden=!1);return}else{i&&(i.textContent=y||"No se pudo registrar el usuario.",i.hidden=!1);return}}}if(typeof l.dbClinicalProfileUpsert=="function"){let u=await l.dbClinicalProfileUpsert({userId:c,clinicalName:a,rank:t,sala:o||null,isProgramAdmin:!1});if(!u?.ok){i&&(i.textContent=u?.error||"No se guard\xF3 el perfil.",i.hidden=!1);return}r.user&&(r.user.rank=t,r.user.clinical_name=a,r.user.sala=o||null,r.user.is_program_admin=0)}S({userId:c,username:n,displayName:a,rank:t,sala:o||"",registered:!0,lanProfileGateComplete:!0,isProgramAdmin:!1});let R=String(document.getElementById("onboard-shift-pin")?.value||"").trim();if(R&&!w()){let{connectLanWithShiftPin:u}=await import("/js/chunks/lan-shift-pin-connect-UMJPOP5W.js");await u(R,{sala:o})||p("No se encontr\xF3 anfitri\xF3n con ese PIN del turno. Revisa Wi\u2011Fi o pide un PIN nuevo al R4.","warning")}i&&(i.hidden=!0),await h(),document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));let{flushClinicalProfileToLan:L,LAN_PROFILE_PUSH_FAILED_MSG:oe,LAN_PROFILE_NEEDS_CONNECT_MSG:le,isBenignLanPushSkipCode:se,isLanProfileNeedsConnectCode:ce,notifyLanProfilePushResult:de}=await import("/js/chunks/clinical-profile-lan-sync-E2KJNZBF.js"),g=await L({sala:o||r.user?.sala});if(de(g,p),!w()&&!g.ok&&ce(g.code)){p(le,"info"),(await import("/js/chunks/clinical-rotation-entry-B7TL4EA6.js")).syncClinicalRotationEntryChrome();let{refreshMainClinicalOnboardingIfNeeded:y}=await import("/js/chunks/clinical-onboarding-main-IJFKI6US.js");await y();return}!g.ok&&!se(g.code)&&!(g.channels&&g.channels.outbox)?p(oe,"warning"):g.ok&&d?p("Perfil guardado y @usuario publicado en la sala \u21C4.","success"):p("Perfil guardado. Abre Mi rotaci\xF3n cuando quieras buscar equipos o crear el tuyo.","success");let{refreshMainClinicalOnboardingIfNeeded:ue}=await import("/js/chunks/clinical-onboarding-main-IJFKI6US.js");await ue()}async function Ie(){let e=m(String(document.getElementById("onboard-username")?.value||"")),n=document.getElementById("onboard-error"),a=document.getElementById("clinical-onboard-resume-btn");if(!C(e)){n&&(n.textContent="Escribe tu usuario LAN para recuperarlo.",n.hidden=!1);return}if(!(await O(e))?.user_id){n&&(n.textContent=`No encontramos @${e} en esta base de datos. Para registrarte, completa el formulario y pulsa Guardar perfil.`,n.hidden=!1);return}a instanceof HTMLButtonElement&&(a.disabled=!0,a.textContent="Recuperando\u2026");let o=f();try{let i=await P(e,o,v());if(!i.ok){n&&(n.textContent=i.error||"No se pudo recuperar la cuenta.",n.hidden=!1);return}n&&(n.hidden=!0),p("Cuenta recuperada.","success"),await h();let s=String(document.getElementById("onboard-clinical-name")?.value||"").trim(),c=String(document.getElementById("onboard-rank")?.value||"R1"),l=String(document.getElementById("onboard-sala")?.value||"").trim(),b=String(r.user?.user_id||""),d=ae();if(b&&d&&typeof d.dbClinicalProfileUpsert=="function"&&s&&l){let L=await d.dbClinicalProfileUpsert({userId:b,clinicalName:s,rank:c,sala:l,isProgramAdmin:!1});if(!L?.ok){n&&(n.textContent=L?.error||"No se guard\xF3 el perfil.",n.hidden=!1);return}r.user&&(r.user.rank=c,r.user.clinical_name=s,r.user.sala=l,r.user.is_program_admin=0),S({userId:b,username:e,displayName:s,rank:c,sala:l,registered:!0,lanProfileGateComplete:!0,isProgramAdmin:!1}),await h(),document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"))}let{refreshMainClinicalOnboardingIfNeeded:R}=await import("/js/chunks/clinical-onboarding-main-IJFKI6US.js");await R(),$()&&p("Completa tu perfil y pulsa Guardar perfil.","info")}finally{a instanceof HTMLButtonElement&&(a.disabled=!1,a.textContent="Recuperar mi usuario")}}async function E(){ie();let e=document.getElementById("clinical-onboard-username-form");e&&!e._rpcOnboardWired&&(e._rpcOnboardWired=!0,e.addEventListener("submit",a=>void Se(a)));let n=document.getElementById("clinical-onboard-resume-btn");n&&!n._rpcResumeWired&&(n._rpcResumeWired=!0,n.addEventListener("click",()=>void Ie()))}async function Ve(){await Q(async e=>{await Re(e)})}async function Re(e){if(!String(r.user?.user_id||"")){if(H()){U(e),await E();return}let{buildOnboardingSessionBlockHtml:i}=await import("/js/chunks/clinical-onboarding-main-IJFKI6US.js");e.innerHTML=await i();return}await X();let a=J(f()),t=k(a),o=t?"":m(String(a.clinicalUsername||""));if(!t&&re()&&o&&C(o))try{(await O(o))?.user_id&&(await P(o,a,v()),await h(),a=f())}catch{}if(!$()){let{hideMainClinicalOnboarding:i}=await import("/js/chunks/clinical-onboarding-main-IJFKI6US.js");if(i(),e.closest("#clinical-teams-panel-body")){let{renderClinicalTeamsPanel:s}=await import("/js/chunks/clinical-teams-SMJ7OM4B.js");await s()}return}if(H()){U(e),await E();return}if(w(a)){ne(e,a),await E();return}{let i=String(a.clinicalRank||r.user?.rank||"R1"),s=t?"":String(a.clinicalDisplayName||r.user?.clinical_name||""),c=String(a.clinicalSala||r.user?.sala||""),l=j(),b=t?`<p class="clinical-onboard-gate-lead">${D}</p>`:"<p>Confirma tu usuario LAN, nombre en guardia, rango y rotaci\xF3n. Para equipos, abre <strong>Mi rotaci\xF3n</strong> despu\xE9s.</p>";e.innerHTML=I({title:"Configura tu rotaci\xF3n",leadHtml:b,stepperIndex:2,bodyHtml:`
      <div class="clinical-onboard-form-shell">
        <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form" novalidate>
          <div class="field-group">
            <label for="onboard-username">Usuario LAN (@usuario) *</label>
            <input id="onboard-username" type="text" class="profile-input" placeholder="ej. drmendoza"
              value="${N(o)}" required autocomplete="off" spellcheck="false">
            <p class="clinical-teams-hint">${W}</p>
          </div>
          <div class="field-group">
            <label for="onboard-clinical-name">Nombre en guardia *</label>
            <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
              value="${N(s)}" required autocomplete="name">
            <p class="clinical-teams-hint">${G}</p>
          </div>
          <div class="field-group">
            <label for="onboard-rank">Rango</label>
            <select id="onboard-rank" class="profile-input">
              <option value="R1" ${i==="R1"?"selected":""}>R1</option>
              <option value="R2" ${i==="R2"?"selected":""}>R2</option>
              <option value="R3" ${i==="R3"?"selected":""}>R3</option>
              <option value="R4" ${i==="R4"?"selected":""}>R4</option>
            </select>
          </div>
          <div class="field-group">
            <label for="onboard-sala">Rotaci\xF3n *</label>
            <select id="onboard-sala" class="profile-input" required>
              <option value="">\u2014 Seleccionar \u2014</option>
              ${Y.map(d=>`<option value="${N(d)}" ${c===d?"selected":""}>${te(d)}</option>`).join("")}
            </select>
          </div>
          <div class="field-group">
            <label for="onboard-shift-pin">PIN del turno (\u21C4)</label>
            <input id="onboard-shift-pin" type="text" class="profile-input" inputmode="numeric"
              pattern="[0-9]{6}" maxlength="6" placeholder="6 d\xEDgitos del anfitri\xF3n" autocomplete="off"
              value="${N(l)}">
            <p class="clinical-teams-hint">6 d\xEDgitos del anfitri\xF3n (\u21C4). R+ conecta solo; si cambias de Wi\u2011Fi, vuelve a usar el mismo PIN.</p>
          </div>
          <p id="onboard-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="btn-save">Guardar perfil</button>
            <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
          </div>
        </form>
      </div>`}),await E()}}export{I as a,U as b,ie as c,re as d,je as e,H as f,$ as g,Je as h,Ve as i,Re as j};
//# sourceMappingURL=/js/chunks/chunk-UFCAOJO3.js.map
