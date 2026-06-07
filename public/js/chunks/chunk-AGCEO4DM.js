import{Ag as I,Bg as h,Eb as j,Rg as V,lb as t,nb as G,sd as J}from"/js/chunks/chunk-VRKLSU74.js";import{b as M}from"/js/chunks/chunk-KVCGO4KM.js";import{a as d,b as y,c as N,e as $,f as T,g as q,h as C,i as D,j as S,k as W,l as F,m as u,o as P,q as z,r as L}from"/js/chunks/chunk-EB35ISET.js";function E(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function se(e){return`<div class="clinical-onboarding-progress" aria-label="Progreso del registro">${["Modo","Perfil","Equipo"].map((r,o)=>{let a=o+1;return`<span class="${(a===e?" is-active":"").trim()}" title="${E(r)}" aria-label="${E(r)}">${a}</span>`}).join("")}</div>`}function v({title:e,leadHtml:n,bodyHtml:i,stepperIndex:r=null}){return`
    <div class="clinical-onboarding-stage">
      <div class="clinical-onboarding-stage-inner">
        ${r!=null?se(r):""}
        <h3 class="clinical-onboarding-title">${E(e)}</h3>
        <div class="clinical-onboarding-lead">${n}</div>
        ${i}
      </div>
    </div>`}var ce='<svg class="clinical-onboard-mode-card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>',de='<svg class="clinical-onboard-mode-card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>';function Y(){return`
        <div class="clinical-onboard-mode-grid" role="group" aria-label="Modo de uso">
          <button type="button" class="clinical-onboard-mode-card clinical-onboard-mode-card--primary" data-sync-mode="lan">
            <span class="clinical-onboard-mode-card-head">
              ${ce}
              <span class="clinical-onboard-mode-card-title">Guardia en red (LAN)</span>
            </span>
            <span class="clinical-onboard-mode-card-desc">Usuario @usuario, sala, sincronizaci\xF3n en vivo con el equipo y <strong>Mi rotaci\xF3n</strong>.</span>
          </button>
          <button type="button" class="clinical-onboard-mode-card" data-sync-mode="local">
            <span class="clinical-onboard-mode-card-head">
              ${de}
              <span class="clinical-onboard-mode-card-title">Solo este equipo</span>
            </span>
            <span class="clinical-onboard-mode-card-desc">Sin LAN ni LiveSync: expedientes y notas solo en esta Mac. Sin rotaciones ni sala compartida.</span>
          </button>
        </div>`}function ue(){return typeof window>"u"?null:window.rplusDb||window.electronAPI||null}function K(e,n="info"){typeof window<"u"&&typeof window.showToast=="function"&&window.showToast(e,n)}function me(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function fe(e){return me(e).replace(/"/g,"&quot;")}function pe(e){return`local_${String(e||"").replace(/[^a-z0-9]/gi,"").toLowerCase().slice(-10)||"device"}`.slice(0,32)}function k(e){e.innerHTML=v({title:"\xBFC\xF3mo usar\xE1s R+?",leadHtml:"<p>Elige antes de configurar tu perfil. La elecci\xF3n queda guardada en este equipo.</p>",bodyHtml:Y(),stepperIndex:1})}function Q(e,n){let i=String(n.clinicalRank||t.user?.rank||"R1"),r=String(n.clinicalDisplayName||t.user?.clinical_name||"");e.innerHTML=v({title:"Perfil local",leadHtml:"<p>R+ no usar\xE1 red de guardia. Solo necesitamos c\xF3mo firmar notas y documentos en esta Mac.</p>",stepperIndex:2,bodyHtml:`
      <div class="clinical-onboard-form-shell clinical-onboard-form-shell--narrow">
        <form id="clinical-onboard-local-form" class="clinical-teams-create-form clinical-onboard-form clinical-onboard-form--local">
          <div class="field-group">
            <label for="onboard-local-name">Tu nombre en notas *</label>
            <input id="onboard-local-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
              value="${fe(r)}" required autocomplete="name">
          </div>
          <div class="field-group">
            <label for="onboard-local-rank">Rango (opcional)</label>
            <select id="onboard-local-rank" class="profile-input">
              <option value="R1" ${i==="R1"?"selected":""}>R1</option>
              <option value="R2" ${i==="R2"?"selected":""}>R2</option>
              <option value="R3" ${i==="R3"?"selected":""}>R3</option>
              <option value="R4" ${i==="R4"?"selected":""}>R4</option>
            </select>
          </div>
          <p id="onboard-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="btn-save">Continuar sin LAN</button>
            <button type="button" id="clinical-onboard-back-mode" class="btn-med-secondary">Cambiar modo</button>
          </div>
        </form>
      </div>`})}async function x(){let{refreshMainClinicalOnboardingIfNeeded:e}=await import("/js/chunks/clinical-onboarding-main-C5FAE73D.js");await e()}async function ge(e){if(e==="local")S(!0);else if(e==="lan")S(!1);else return;await x()}async function be(){let e=u();delete e.clinicalLocalOnly;try{localStorage.setItem("rpc-settings",JSON.stringify(e))}catch{}await x()}async function ye(e){e.preventDefault();let n=String(document.getElementById("onboard-local-name")?.value||"").trim(),i=String(document.getElementById("onboard-local-rank")?.value||"R1"),r=document.getElementById("onboard-error");if(!n){r&&(r.textContent="Escribe c\xF3mo quieres aparecer en notas y documentos.",r.hidden=!1);return}let o=ue(),a=String(t.user?.user_id||"");if(!a||!o){K("Sesi\xF3n cl\xEDnica no disponible.","error");return}let l=pe(a);if(d(t.user?.username||"")!==l&&typeof o.dbClinicalUsernameClaim=="function"){let s=await o.dbClinicalUsernameClaim({userId:a,username:l});if(!s?.ok&&!/ya está en uso/i.test(String(s?.error||""))){r&&(r.textContent=s?.error||"No se pudo guardar el perfil local.",r.hidden=!1);return}s?.ok&&t.user&&(t.user.username=l)}if(typeof o.dbClinicalProfileUpsert=="function"){let s=await o.dbClinicalProfileUpsert({userId:a,clinicalName:n,rank:i,sala:null,isProgramAdmin:!1});if(!s?.ok){r&&(r.textContent=s?.error||"No se guard\xF3 el perfil.",r.hidden=!1);return}t.user&&(t.user.rank=i,t.user.clinical_name=n,t.user.sala=null,t.user.is_program_admin=0)}L({userId:a,username:l,displayName:n,rank:i,sala:"",registered:!0,lanProfileGateComplete:!0,isProgramAdmin:!1}),S(!0),r&&(r.hidden=!0),await h(),document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed")),K("Listo. R+ queda solo en este equipo, sin sincronizaci\xF3n LAN.","success"),await x()}function X(){let e=document.querySelector(".clinical-onboard-mode-grid");e&&!e._rpcModeWired&&(e._rpcModeWired=!0,e.addEventListener("click",r=>{let o=r.target.closest("[data-sync-mode]");o&&ge(String(o.getAttribute("data-sync-mode")||""))}));let n=document.getElementById("clinical-onboard-local-form");n&&!n._rpcLocalWired&&(n._rpcLocalWired=!0,n.addEventListener("submit",r=>void ye(r)));let i=document.getElementById("clinical-onboard-back-mode");i&&!i._rpcBackModeWired&&(i._rpcBackModeWired=!0,i.addEventListener("click",()=>void be()))}function he(){return typeof window>"u"?null:window.rplusDb||window.electronAPI||null}function m(e,n="info"){typeof window<"u"&&typeof window.showToast=="function"&&window.showToast(e,n)}function w(){try{let e=JSON.parse(localStorage.getItem("rpc-settings")||"{}");return String(e.clientId||"")}catch{return""}}function A(){let e=t.user;if(!e?.user_id||N(e.username,w()))return!0;try{let i=JSON.parse(localStorage.getItem("rpc-settings")||"{}"),r=String(i.clinicalUsername||"").trim();if(r&&!y(d(r))||r&&N(e.username,w()))return!0}catch{}let n=d(e.username||"");return!y(n)}function We(){if(!t.user?.user_id)return!0;let e=t.teams||[];return j(e,t.user).length===0}function O(){if(!M())return!1;let e=u();return!(e.clinicalRegistered===!0||D(e))}function Z(){if(!M())return!1;if(!t.user?.user_id||O())return!0;let e=u();return C(e)?e.clinicalRegistered!==!0?!0:!String(t.user?.clinical_name||"").trim():!!(P(e)||W(t.user?.username)||A()||!String(t.user?.clinical_name||"").trim()||!String(t.user?.sala||"").trim())}function Fe(){return Z()}function ee(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function R(e){return ee(e).replace(/"/g,"&quot;")}async function Ce(e){e.preventDefault();let n=d(String(document.getElementById("onboard-username")?.value||"")),i=String(document.getElementById("onboard-clinical-name")?.value||"").trim(),r=String(document.getElementById("onboard-rank")?.value||"R1"),o=String(document.getElementById("onboard-sala")?.value||"").trim(),a=document.getElementById("onboard-error");if(!y(n)){a&&(a.textContent="Usuario LAN inv\xE1lido. Usa 3\u201332 letras min\xFAsculas (a-z, 0-9, _), p. ej. drmendoza \u2014 no tu nombre en guardia.",a.hidden=!1);return}if(!i){a&&(a.textContent="Escribe tu nombre en guardia.",a.hidden=!1);return}let l=u(),f=String(t.user?.user_id||""),s=he();if(!f||!s){m("Sesi\xF3n cl\xEDnica no disponible.","error");return}let g=d(t.user?.username||"")!==n;if(g){let{assertLanRoomForUsernameRegister:c}=await import("/js/chunks/clinical-profile-lan-sync-FTVAD37Y.js");await c({sala:o})}if(g&&typeof s.dbClinicalUsernameClaim=="function"){let c=await s.dbClinicalUsernameClaim({userId:f,username:n});if(c?.ok)t.user&&(t.user.username=n);else{let b=String(c?.error||"");if(/ya está en uso/i.test(b))if(d(String(l.clinicalUsername||""))===n||window.confirm(`El usuario @${n} ya est\xE1 registrado en esta base de datos.

\xBFRecuperar tu cuenta en este dispositivo?`)){let B=await I(n,l,w());if(!B.ok){a&&(a.textContent=B.error||b,a.hidden=!1);return}f=String(t.user?.user_id||""),l=u()}else{a&&(a.textContent=b,a.hidden=!1);return}else{a&&(a.textContent=b||"No se pudo registrar el usuario.",a.hidden=!1);return}}}if(typeof s.dbClinicalProfileUpsert=="function"){let c=await s.dbClinicalProfileUpsert({userId:f,clinicalName:i,rank:r,sala:o||null,isProgramAdmin:!1});if(!c?.ok){a&&(a.textContent=c?.error||"No se guard\xF3 el perfil.",a.hidden=!1);return}t.user&&(t.user.rank=r,t.user.clinical_name=i,t.user.sala=o||null,t.user.is_program_admin=0)}L({userId:f,username:n,displayName:i,rank:r,sala:o||"",registered:!0,lanProfileGateComplete:!0,isProgramAdmin:!1});let U=String(document.getElementById("onboard-shift-pin")?.value||"").trim();if(U&&!C()){let{connectLanWithShiftPin:c}=await import("/js/chunks/lan-shift-pin-connect-2N7NEM73.js");await c(U,{sala:o})||m("No se encontr\xF3 anfitri\xF3n con ese PIN del turno. Revisa Wi\u2011Fi o pide un PIN nuevo al R4.","warning")}a&&(a.hidden=!0),await h(),document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));let{flushClinicalProfileToLan:ne,LAN_PROFILE_PUSH_FAILED_MSG:ie,LAN_PROFILE_NEEDS_CONNECT_MSG:ae,isBenignLanPushSkipCode:re,isLanProfileNeedsConnectCode:te,notifyLanProfilePushResult:oe}=await import("/js/chunks/clinical-profile-lan-sync-FTVAD37Y.js"),p=await ne({sala:o||t.user?.sala});if(oe(p,m),!C()&&!p.ok&&te(p.code)){m(ae,"info"),(await import("/js/chunks/clinical-rotation-entry-OMIXFVNJ.js")).syncClinicalRotationEntryChrome();let{refreshMainClinicalOnboardingIfNeeded:b}=await import("/js/chunks/clinical-onboarding-main-C5FAE73D.js");await b();return}!p.ok&&!re(p.code)&&!(p.channels&&p.channels.outbox)?m(ie,"warning"):p.ok&&g?m("Perfil guardado y @usuario publicado en la sala \u21C4.","success"):m("Perfil guardado. Abre Mi rotaci\xF3n cuando quieras buscar equipos o crear el tuyo.","success");let{refreshMainClinicalOnboardingIfNeeded:le}=await import("/js/chunks/clinical-onboarding-main-C5FAE73D.js");await le()}async function ve(){let e=d(String(document.getElementById("onboard-username")?.value||"")),n=document.getElementById("onboard-error"),i=document.getElementById("clinical-onboard-resume-btn");if(!y(e)){n&&(n.textContent="Escribe tu usuario LAN para recuperarlo.",n.hidden=!1);return}i instanceof HTMLButtonElement&&(i.disabled=!0,i.textContent="Recuperando\u2026");let r=u();try{let o=await I(e,r,w());if(!o.ok){n&&(n.textContent=o.error||"No se pudo recuperar la cuenta.",n.hidden=!1);return}if(n&&(n.hidden=!0),m("Cuenta recuperada.","success"),await h(),!A()){let{refreshMainClinicalOnboardingIfNeeded:l}=await import("/js/chunks/clinical-onboarding-main-C5FAE73D.js");await l();return}m("Completa tu perfil y pulsa Continuar.","info");let{refreshMainClinicalOnboardingIfNeeded:a}=await import("/js/chunks/clinical-onboarding-main-C5FAE73D.js");await a()}finally{i instanceof HTMLButtonElement&&(i.disabled=!1,i.textContent="Recuperar mi usuario")}}async function _(){X();let e=document.getElementById("clinical-onboard-username-form");e&&!e._rpcOnboardWired&&(e._rpcOnboardWired=!0,e.addEventListener("submit",i=>void Ce(i)));let n=document.getElementById("clinical-onboard-resume-btn");n&&!n._rpcResumeWired&&(n._rpcResumeWired=!0,n.addEventListener("click",()=>void ve()))}async function ze(){await J(async e=>{await we(e)})}async function we(e){if(!String(t.user?.user_id||"")){if(O()){k(e),await _();return}let{buildOnboardingSessionBlockHtml:a}=await import("/js/chunks/clinical-onboarding-main-C5FAE73D.js");e.innerHTML=await a();return}await V();let i=z(u()),r=P(i),o=r?"":d(String(i.clinicalUsername||""));if(!r&&A()&&o&&y(o))try{await I(o,i,w()),await h(),i=u()}catch{}if(!Z()){let{hideMainClinicalOnboarding:a}=await import("/js/chunks/clinical-onboarding-main-C5FAE73D.js");if(a(),e.closest("#clinical-teams-panel-body")){let{renderClinicalTeamsPanel:l}=await import("/js/chunks/clinical-teams-UQUFHSW3.js");await l()}return}if(O()){k(e),await _();return}if(C(i)){Q(e,i),await _();return}{let a=String(i.clinicalRank||t.user?.rank||"R1"),l=r?"":String(i.clinicalDisplayName||t.user?.clinical_name||""),f=String(i.clinicalSala||t.user?.sala||""),s=F(),H=r?`<p class="clinical-onboard-gate-lead">${$}</p>`:"<p>Confirma tu usuario LAN, nombre en guardia, rango y rotaci\xF3n. Para equipos, abre <strong>Mi rotaci\xF3n</strong> despu\xE9s.</p>";e.innerHTML=v({title:"Configura tu rotaci\xF3n",leadHtml:H,stepperIndex:2,bodyHtml:`
      <div class="clinical-onboard-form-shell">
        <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form" novalidate>
          <div class="field-group">
            <label for="onboard-username">Usuario LAN (@usuario) *</label>
            <input id="onboard-username" type="text" class="profile-input" placeholder="ej. drmendoza"
              value="${R(o)}" required autocomplete="off" spellcheck="false">
            <p class="clinical-teams-hint">${T}</p>
          </div>
          <div class="field-group">
            <label for="onboard-clinical-name">Nombre en guardia *</label>
            <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
              value="${R(l)}" required autocomplete="name">
            <p class="clinical-teams-hint">${q}</p>
          </div>
          <div class="field-group">
            <label for="onboard-rank">Rango</label>
            <select id="onboard-rank" class="profile-input">
              <option value="R1" ${a==="R1"?"selected":""}>R1</option>
              <option value="R2" ${a==="R2"?"selected":""}>R2</option>
              <option value="R3" ${a==="R3"?"selected":""}>R3</option>
              <option value="R4" ${a==="R4"?"selected":""}>R4</option>
            </select>
          </div>
          <div class="field-group">
            <label for="onboard-sala">Rotaci\xF3n *</label>
            <select id="onboard-sala" class="profile-input" required>
              <option value="">\u2014 Seleccionar \u2014</option>
              ${G.map(g=>`<option value="${R(g)}" ${f===g?"selected":""}>${ee(g)}</option>`).join("")}
            </select>
          </div>
          <div class="field-group">
            <label for="onboard-shift-pin">PIN del turno (\u21C4)</label>
            <input id="onboard-shift-pin" type="text" class="profile-input" inputmode="numeric"
              pattern="[0-9]{6}" maxlength="6" placeholder="6 d\xEDgitos del anfitri\xF3n" autocomplete="off"
              value="${R(s)}">
            <p class="clinical-teams-hint">6 d\xEDgitos del anfitri\xF3n (\u21C4). R+ conecta solo; si cambias de Wi\u2011Fi, vuelve a usar el mismo PIN.</p>
          </div>
          <p id="onboard-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="btn-save">Guardar perfil</button>
            <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
          </div>
        </form>
      </div>`}),await _()}}export{v as a,k as b,X as c,A as d,We as e,O as f,Z as g,Fe as h,ze as i,we as j};
//# sourceMappingURL=/js/chunks/chunk-AGCEO4DM.js.map
