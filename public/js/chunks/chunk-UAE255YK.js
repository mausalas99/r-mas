import{Bd as M,H as c,Hc as x,I as g,J as I,M as U,gd as t,md as h,nd as y}from"/js/chunks/chunk-S6WJHY5W.js";import{b as _}from"/js/chunks/chunk-KVCGO4KM.js";import{b as L,c as E,d as N,e as m,g as w,i as P,j as A}from"/js/chunks/chunk-OQOKUSUF.js";function q(){return typeof window>"u"?null:window.rplusDb||window.electronAPI||null}function f(e,a="info"){typeof window<"u"&&typeof window.showToast=="function"&&window.showToast(e,a)}function b(){try{let e=JSON.parse(localStorage.getItem("rpc-settings")||"{}");return String(e.clientId||"")}catch{return""}}function R(){let e=t.user;if(!e?.user_id||I(e.username,b()))return!0;try{let r=JSON.parse(localStorage.getItem("rpc-settings")||"{}"),i=String(r.clinicalUsername||"").trim();if(i&&!g(c(i))||i&&I(e.username,b()))return!0}catch{}let a=c(e.username||"");return!g(a)}function re(){if(!t.user?.user_id)return!0;let e=t.teams||[];return U(e,t.user).length===0}function T(){return _()?!!(!t.user?.user_id||w(m())||R()||!String(t.user?.clinical_name||"").trim()||!String(t.user?.sala||"").trim()):!1}function te(){return T()}function G(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function k(e){return G(e).replace(/"/g,"&quot;")}async function F(e){e.preventDefault();let a=c(String(document.getElementById("onboard-username")?.value||"")),r=String(document.getElementById("onboard-clinical-name")?.value||"").trim(),i=String(document.getElementById("onboard-rank")?.value||"R1"),o=String(document.getElementById("onboard-sala")?.value||"").trim(),n=document.getElementById("onboard-error");if(!g(a)){n&&(n.textContent="Usuario LAN inv\xE1lido. Usa 3\u201332 letras min\xFAsculas (a-z, 0-9, _), p. ej. drmendoza \u2014 no tu nombre en guardia.",n.hidden=!1);return}if(!r){n&&(n.textContent="Escribe tu nombre en guardia.",n.hidden=!1);return}let s=m(),l=String(t.user?.user_id||""),u=q();if(!l||!u){f("Sesi\xF3n cl\xEDnica no disponible.","error");return}let S=c(t.user?.username||"")!==a;if(S){let{assertLanRoomForUsernameRegister:d}=await import("/js/chunks/clinical-profile-lan-sync-MVSZJZCG.js");await d({sala:o})}if(S&&typeof u.dbClinicalUsernameClaim=="function"){let d=await u.dbClinicalUsernameClaim({userId:l,username:a});if(d?.ok)t.user&&(t.user.username=a);else{let C=String(d?.error||"");if(/ya está en uso/i.test(C))if(c(String(s.clinicalUsername||""))===a||window.confirm(`El usuario @${a} ya est\xE1 registrado en esta base de datos.

\xBFRecuperar tu cuenta en este dispositivo?`)){let v=await h(a,s,b());if(!v.ok){n&&(n.textContent=v.error||C,n.hidden=!1);return}l=String(t.user?.user_id||""),s=m()}else{n&&(n.textContent=C,n.hidden=!1);return}else{n&&(n.textContent=C||"No se pudo registrar el usuario.",n.hidden=!1);return}}}if(typeof u.dbClinicalProfileUpsert=="function"){let d=await u.dbClinicalProfileUpsert({userId:l,clinicalName:r,rank:i,sala:o||null,isProgramAdmin:!1});if(!d?.ok){n&&(n.textContent=d?.error||"No se guard\xF3 el perfil.",n.hidden=!1);return}t.user&&(t.user.rank=i,t.user.clinical_name=r,t.user.sala=o||null,t.user.is_program_admin=0)}A({userId:l,username:a,displayName:r,rank:i,sala:o||"",registered:!0,lanProfileGateComplete:!0,isProgramAdmin:!1}),n&&(n.hidden=!0),await y(),document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));let{flushClinicalProfileToLan:B,LAN_PROFILE_PUSH_FAILED_MSG:O,isBenignLanPushSkipCode:$,notifyLanProfilePushResult:H}=await import("/js/chunks/clinical-profile-lan-sync-MVSZJZCG.js"),p=await B();H(p,f),!p.ok&&!$(p.code)&&!(p.channels&&p.channels.outbox)?f(O,"warning"):p.ok&&S?f("Perfil guardado y @usuario publicado en la sala \u21C4.","success"):f("Perfil guardado. Abre Mi rotaci\xF3n cuando quieras buscar equipos o crear el tuyo.","success");let{refreshMainClinicalOnboardingIfNeeded:D}=await import("/js/chunks/clinical-onboarding-main-QERQR5CN.js");await D()}async function z(){let e=c(String(document.getElementById("onboard-username")?.value||"")),a=document.getElementById("onboard-error"),r=document.getElementById("clinical-onboard-resume-btn");if(!g(e)){a&&(a.textContent="Escribe tu usuario LAN para recuperarlo.",a.hidden=!1);return}r instanceof HTMLButtonElement&&(r.disabled=!0,r.textContent="Recuperando\u2026");let i=m();try{let o=await h(e,i,b());if(!o.ok){a&&(a.textContent=o.error||"No se pudo recuperar la cuenta.",a.hidden=!1);return}if(a&&(a.hidden=!0),f("Cuenta recuperada.","success"),await y(),!R()){let{refreshMainClinicalOnboardingIfNeeded:s}=await import("/js/chunks/clinical-onboarding-main-QERQR5CN.js");await s();return}f("Completa tu perfil y pulsa Continuar.","info");let{refreshMainClinicalOnboardingIfNeeded:n}=await import("/js/chunks/clinical-onboarding-main-QERQR5CN.js");await n()}finally{r instanceof HTMLButtonElement&&(r.disabled=!1,r.textContent="Recuperar mi usuario")}}async function W(){let e=document.getElementById("clinical-onboard-username-form");e&&!e._rpcOnboardWired&&(e._rpcOnboardWired=!0,e.addEventListener("submit",r=>void F(r)));let a=document.getElementById("clinical-onboard-resume-btn");a&&!a._rpcResumeWired&&(a._rpcResumeWired=!0,a.addEventListener("click",()=>void z()))}async function ie(){await x(async e=>{await j(e)})}async function j(e){if(!String(t.user?.user_id||"")){e.innerHTML='<p class="clinical-teams-lead">Activa la sesi\xF3n cl\xEDnica para continuar.</p>';return}await M();let r=P(m()),i=w(r),o=i?"":c(String(r.clinicalUsername||""));if(!i&&R()&&o&&g(o))try{await h(o,r,b()),await y(),r=m()}catch{}if(!T()){let{hideMainClinicalOnboarding:n}=await import("/js/chunks/clinical-onboarding-main-QERQR5CN.js");if(n(),e.closest("#clinical-teams-panel-body")){let{renderClinicalTeamsPanel:s}=await import("/js/chunks/clinical-teams-X7MYBAU3.js");await s()}return}{let n=String(r.clinicalRank||t.user?.rank||"R1"),s=i?"":String(r.clinicalDisplayName||t.user?.clinical_name||""),l=String(r.clinicalSala||t.user?.sala||""),u=i?`<p class="clinical-teams-lead clinical-onboard-gate-lead">${L}</p>`:'<p class="clinical-teams-lead">Confirma tu usuario LAN, nombre en guardia, rango y sala. Para equipos, abre <strong>Mi rotaci\xF3n</strong> despu\xE9s.</p>';e.innerHTML=`
      <h3 class="clinical-onboarding-title">Configura tu rotaci\xF3n</h3>
      <h4 class="clinical-teams-section-title">Usuario y nombre en guardia</h4>
      ${u}
      <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form">
        <div class="field-group">
          <label for="onboard-username">Usuario LAN (@usuario) *</label>
          <input id="onboard-username" type="text" class="profile-input" placeholder="ej. drmendoza"
            value="${k(o)}" required autocomplete="off" spellcheck="false">
          <p class="clinical-teams-hint">${E}</p>
        </div>
        <div class="field-group">
          <label for="onboard-clinical-name">Nombre en guardia *</label>
          <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
            value="${k(s)}" required autocomplete="name">
          <p class="clinical-teams-hint">${N}</p>
        </div>
        <div class="field-group">
          <label for="onboard-rank">Rango</label>
          <select id="onboard-rank" class="profile-input">
            <option value="R1" ${n==="R1"?"selected":""}>R1</option>
            <option value="R2" ${n==="R2"?"selected":""}>R2</option>
            <option value="R3" ${n==="R3"?"selected":""}>R3</option>
            <option value="R4" ${n==="R4"?"selected":""}>R4</option>
          </select>
        </div>
        <div class="field-group">
          <label for="onboard-sala">Sala *</label>
          <select id="onboard-sala" class="profile-input" required>
            <option value="">\u2014 Seleccionar \u2014</option>
            <option value="Sala 1" ${l==="Sala 1"?"selected":""}>Sala 1</option>
            <option value="Sala 2" ${l==="Sala 2"?"selected":""}>Sala 2</option>
            <option value="Sala E" ${l==="Sala E"?"selected":""}>Sala E</option>
          </select>
        </div>
        <p id="onboard-error" class="clinical-registration-error" hidden></p>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Guardar perfil</button>
          <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
        </div>
      </form>`,await W()}}export{R as a,re as b,T as c,te as d,ie as e,j as f};
//# sourceMappingURL=/js/chunks/chunk-UAE255YK.js.map
