/* Fry Blocks · BeaconScript blocks (Beaconfall mods). One line per block, see langs.js for the format.
   Everything here uses fields (no value plugs) because a BeaconScript line is plain text. Text fields use the "bs" cleaner (no quotes, no new lines). */
(function(){
'use strict';
if(!window.BL||!BL.GEN.bs) return;
var K={mod:'#7a5a1c',ev:'#c2410c',say:'#0e7490',item:'#8a6d00',world:'#2f8a3a',vars:'#9a4a3a',logic:'#4f6f8f',def:'#6d28d9',mob:'#b3262e',win:'#1769c4',sig:'#566376'};

var ITEMS='stick:나뭇가지,bench:작업대,sapling:묘목,log:통나무,plank:판자,stone:돌,iron:철,gold:금,copper:구리,zinc:아연,rwood:강화목재,riron:강화철,rcopper:강화구리,rgold:강화금,'
 +'iron_ingot:철 주괴,copper_ingot:구리 주괴,gold_ingot:금 주괴,zinc_ingot:아연 주괴,crystal:수정,obsidian:화산석,clay:점토,brick:벽돌,leather:가죽,bone:뼈다귀,feather:깃털,thread:실,paper:종이,coin:동전,glue:접착제,rubber:고무,resin:송진,'
 +'pickaxe_log:통나무 곡괭이,pickaxe_stone:돌 곡괭이,pickaxe_iron:철 곡괭이,pickaxe_gold:금 곡괭이,axe_log:통나무 도끼,axe_stone:돌 도끼,axe_iron:철 도끼,axe_gold:금 도끼,'
 +'sword_log:통나무 장검,sword_stone:돌 장검,sword_iron:철 장검,sword_riron:강화철 장검,sword_gold:금 장검,dagger_iron:철 단검,hammer_iron:철 망치,hoe_iron:철 괭이,bow_iron:철 활,arrow:화살,rod_iron:철 낚싯대,'
 +'ar_helm_iron_1:철 헬멧 ★,ar_chest_iron_1:철 흉갑 ★,ar_legs_iron_1:철 각반 ★,ar_boots_iron_1:철 신발 ★,ar_chest_iron_3:철 흉갑 ★★★,'
 +'pot_heal:회복 물약,pot_swift:질풍 물약,pot_might:괴력 물약,pot_guard:철벽 물약,bread:빵,steak:구운 고기,raw_meat:생고기,potato:감자,corn:옥수수,egg:달걀,milk:우유,stew:스튜,'
 +'torch:횃불,chest:보관함,bed:침대,door:문,fence:울타리,furnace:용광로,oven:화덕,anvil:모루,table:탁자,chair:의자,lamp:스탠드 등,flag:깃발,compass:나침반,clock:시계,boat:보트,horse:말,'
 +'rune_fire:화염의 룬,rune_ice:냉기의 룬,rune_venom:맹독의 룬,rune_life:생명의 룬,beacon:신호기,gear:톱니바퀴,circuit:회로조각,void_essence:공허의 정수,voidcore:공허의 핵';
var ORES='iron:철,gold:금,copper:구리,zinc:아연';
var MOBS='slime:슬라임,vslime:독 슬라임,wolf:늑대,scorpion:전갈,spirit:정령,spider:거미,snake:뱀,golem:골렘,croc:악어,yeti:설인,pirate:해적,bwolf:늑대왕,bscorp:전갈왕,bmagma:불꽃 거인,bspider:거미 여왕,bsnake:모래뱀,bgolem:바위 거인,bcroc:악어왕,byeti:대설인';
var BIOMES='start:시작 섬,forest:숲,desert:사막,volcano:화산,jungle:정글,mesa:메사,rock:바위산,mangrove:맹그로브,ice:얼음';
var EFFECTS='speed:속도,strength:힘,defense:방어,regen:재생,haste:성급함,breath:숨결,night:야간 시야,stun:기절';
var SOUNDS='click:딸깍,hurt:아야,swing:휘두르기,bow:활,hit:타격,break:부서짐';
var STRUCTS='village:마을,small_village:작은 마을,fossil:화석,volcano:화산 터';
var WEAR='head:머리,chest:몸통,legs:다리,feet:발,bag:가방';
var HELD='speed:속도,strength:힘,defense:방어,regen:재생,haste:성급함';
var KEYS=(function(){ var a=[], i; for(i=65;i<=90;i++) a.push(String.fromCharCode(i)+':'+String.fromCharCode(i)); for(i=0;i<=9;i++) a.push(i+':'+i);
  a.push('Space:스페이스','Control:Ctrl','Shift:Shift','Tab:Tab','Enter:Enter'); for(i=1;i<=12;i++) a.push('F'+i+':F'+i); return a.join(','); })();
var OPS='>=:이상,<=:이하,>:초과,<:미만,=:같음,!=:다름';
var POS='top left:왼쪽 위,top right:오른쪽 위,bottom left:왼쪽 아래,bottom right:오른쪽 아래,center:가운데';
var WHO=':(그냥~말하기), to player:플레이어에게, to monster:몬스터에게';
var VAR='[W|n:변수,s:공유~변수,l:임시~변수] [V=score|bsv]';
var ITEM=function(n){ return '[I'+(n||'')+'|'+ITEMS+']'; };

/* leading space in a value makes the optional word part of the template:  on kill#M:  ->  "on kill wolf:"  */
var cats=[
{id:'mod',name:'모드 정보',colour:K.mod,rows:[
  '-모드 파일의 맨 위에 한 번만 놓아요',
  ['bx_mod','e','모드 이름 [N=내~모드|bs]','mod ##N\n','모드의 이름이에요 (맨 위에 놓아요)'],
  ['bx_desc','e','모드 설명 [N=재미있는~모드예요|bs]','mod_describtion: ##N','모드 소개 글이에요'],
  ['bx_uuid','e','모드 고유번호 [N=00000000-0000-4000-8000-000000000000|bs]','use_mod_uuid: #N\n','모드를 구분하는 번호예요 (남과 겹치지 않게 바꿔요)'],
  ['bx_comment','e','메모: [T=여기에~메모를~써요|bs]','# #T','실행되지 않는 설명 글이에요'],
  ['bx_modif','a','다른 모드 [N=potato~api|bs] 가 있으면 {BODY:BSA}','if mod ##N:\n%B','필요한 다른 모드가 켜져 있을 때만 실행해요']
]},
{id:'ev',name:'언제 실행할까',colour:K.ev,rows:[
  '-게임의 큰 사건',
  ['bx_on_join','e','플레이어가 들어오면 {BODY:BSA}','on join:\n%B\n'],
  ['bx_on_quit','e','플레이어가 나가면 {BODY:BSA}','on quit:\n%B\n'],
  ['bx_on_die','e','플레이어가 죽으면 {BODY:BSA}','on die:\n%B\n'],
  ['bx_on_respawn','e','플레이어가 다시 살아나면 {BODY:BSA}','on respawn:\n%B\n'],
  ['bx_on_gen','e','월드를 새로 만들 때 {BODY:BSA}','on world generate:\n%B\n','월드가 처음 만들어질 때 한 번만 실행돼요 (안에서 섬을 꾸며요)'],
  ['bx_on_load','e','월드를 불러올 때 {BODY:BSA}','on world load:\n%B\n'],
  ['bx_on_day','e','아침이 되면 {BODY:BSA}','on day:\n%B\n'],
  ['bx_on_night','e','밤이 되면 {BODY:BSA}','on night:\n%B\n'],
  '-플레이어가 하는 일',
  ['bx_on_mine','e','광석을 캘 때 {BODY:BSA}','on mine:\n%B\n'],
  ['bx_on_chop','e','나무를 벨 때 {BODY:BSA}','on chop:\n%B\n'],
  ['bx_on_break','e','블록을 부술 때 {BODY:BSA}','on break:\n%B\n'],
  ['bx_on_destroy','e','건물·물건이 부서질 때 {BODY:BSA}','on destroy:\n%B\n'],
  ['bx_on_kill','e','[M|:아무~몬스터, slime:슬라임, wolf:늑대, scorpion:전갈, spirit:정령, spider:거미, snake:뱀, golem:골렘, croc:악어, yeti:설인, pirate:해적] 를 잡으면 {BODY:BSA}','on kill#M:\n%B\n','몬스터를 잡았을 때 실행해요'],
  ['bx_on_craft','e','무언가 만들면 {BODY:BSA}','on craft:\n%B\n'],
  ['bx_on_place','e','물건을 놓으면 {BODY:BSA}','on place:\n%B\n'],
  ['bx_on_eat','e','음식을 먹으면 {BODY:BSA}','on eat:\n%B\n'],
  ['bx_on_fish','e','물고기를 낚으면 {BODY:BSA}','on fish:\n%B\n'],
  ['bx_on_roll','e','구르면 {BODY:BSA}','on roll:\n%B\n'],
  ['bx_on_inter','e','F키로 무언가 만지면 {BODY:BSA}','on interaction:\n%B\n'],
  ['bx_on_travel','e','다른 곳으로 이동하면 {BODY:BSA}','on travel:\n%B\n'],
  ['bx_on_dmg','e','[W|:누가~다치든, of player:플레이어가~다치면, of monster:몬스터가~다치면] {BODY:BSA}','on damage#W:\n%B\n'],
  ['bx_on_biome','e','[B|'+BIOMES+'] 지역에 들어서면 {BODY:BSA}','on biome enter #B:\n%B\n'],
  '-마우스와 키보드',
  ['bx_on_lclick','e','왼쪽 클릭하면 {BODY:BSA}','on left_click:\n%B\n'],
  ['bx_on_rclick','e','오른쪽 클릭하면 {BODY:BSA}','on right_click:\n%B\n'],
  ['bx_on_click','e','클릭하면 {BODY:BSA}','on click:\n%B\n'],
  ['bx_on_key','e','[K|'+KEYS+'] 키를 누르면 {BODY:BSA}','on key "#K" press:\n%B\n'],
  ['bx_on_keycd','e','[K|'+KEYS+'] 키를 누르면 (다시 누르려면 [S#5:1:600] 초 기다려요) {BODY:BSA}','on key "#K" press cooldown #S seconds:\n%B\n','연타하지 못하게 쿨타임을 줘요'],
  ['bx_on_key2','e','[K|'+KEYS+'] 또는 [L|'+KEYS+'] 키를 누르면 {BODY:BSA}','on key "#K" or "#L" press:\n%B\n'],
  '-반복·명령·신호',
  ['bx_every','e','[N#5:1:3600] 초마다 {BODY:BSA}','every #N seconds:\n%B\n','정해진 시간마다 계속 실행해요'],
  ['bx_every_v','e','변수 [V=wait|bsv] 초마다 {BODY:BSA}','every %{#V}% seconds:\n%B\n'],
  ['bx_on_cmd','e','채팅에서 /[T=hello|key] 를 치면 {BODY:BSA}','on command ##T:\n%B\n','내가 만든 명령어예요'],
  ['bx_on_sig','e','신호 [T=hello|bs] 를 받으면 {BODY:BSA}','on signal ##T:\n%B\n','다른 모드가 보낸 신호를 받아요']
]},
{id:'say',name:'말하기·화면',colour:K.say,rows:[
  '-채팅과 알림',
  ['bx_chat','a','채팅 [T=안녕하세요!|bs]','chat ##T','채팅창에 글을 보여 줘요 (%player_name% 처럼 쓰면 이름이 들어가요)'],
  ['bx_chat_to','a','채팅 [T=안녕하세요!|bs] [W|'+WHO+']','chat ##T#W'],
  ['bx_say','a','말하기 [T=안녕하세요!|bs]','say ##T'],
  ['bx_broadcast','a','모두에게 알리기 [T=공지입니다|bs]','broadcast ##T'],
  ['bx_title','a','화면 가운데 큰 글씨 [T=시작!|bs]','title ##T'],
  ['bx_title2','a','화면 가운데 큰 글씨 [T=시작!|bs] [N#3:1:60] 초 동안','title ##T for #N seconds'],
  ['bx_chatv','a','채팅 [T=점수는~%{score}%점|bs]','chat ##T','%{변수이름}% 을 쓰면 변수 값이 들어가요'],
  ['bx_chatph','a','채팅 [P|%player_name%:플레이어~이름,%player_location%:플레이어~위치,%player_hp%:플레이어~체력,%player_x%:플레이어~x,%player_z%:플레이어~z,%random_player%:아무~플레이어]','chat "#P"'],
  '-화면 위 글씨 (HUD)',
  ['bx_hud','a','화면 [P|'+POS+'] 에 글씨 [T=점수~%{score}%|bs]','hud ##T at #P'],
  ['bx_hudclr','a','화면 글씨 모두 지우기','hud clear'],
  ['bx_hudclr2','a','화면 [P|'+POS+'] 의 글씨 지우기','hud clear at #P'],
  '-소리',
  ['bx_sound','a','소리 [S|'+SOUNDS+'] 내기','play sound #S'],
  '-창 열고 닫기',
  ['bx_openwin','a','창 [N=내~창|bs] 열기','open window ##N','"창 만들기" 에서 만든 창을 열어요'],
  ['bx_closewin','a','창 닫기','close window'],
  ['bx_remap','e','[A|'+KEYS+'] 키를 [B|'+KEYS+'] 키로 바꾸기','remap "#A" to "#B"','키 이름을 다른 키로 바꿔요']
]},
{id:'item',name:'아이템·플레이어',colour:K.item,rows:[
  '-주고 받기',
  ['bx_give','a','플레이어에게 '+ITEM()+' [N#1:1:9999] 개 주기','give #N #I'],
  ['bx_give_my','a','플레이어에게 내 아이템 [I=내~아이템|bs] [N#1:1:9999] 개 주기','give #N ##I','"새 아이템 만들기" 로 만든 아이템 이름을 써요'],
  ['bx_remove','a','플레이어에게서 '+ITEM()+' [N#1:1:9999] 개 빼앗기','remove #N #I'],
  ['bx_remove_my','a','플레이어에게서 내 아이템 [I=내~아이템|bs] [N#1:1:9999] 개 빼앗기','remove #N ##I'],
  ['bx_recipe','a','제작법 바꾸기: '+ITEM()+' 를 만들려면 [A|'+ITEMS+'] [N#2:1:99] 개 + [B|'+ITEMS+'] [M#1:1:99] 개','set recipe #I to #A #N, #B #M'],
  '-몸 상태',
  ['bx_heal','a','체력 [N#5:1:999] 회복','heal player #N'],
  ['bx_hurt','a','체력 [N#5:1:999] 깎기','damage player #N'],
  ['bx_effect','a','[E|'+EFFECTS+'] 효과 [N#10:1:3600] 초','give effect #E #N seconds','플레이어에게 잠깐 효과를 줘요'],
  ['bx_effect2','a','[E|'+EFFECTS+'] 효과 [N#10:1:3600] 초 (대상 [W|:플레이어, to monster:몬스터])','give effect #E #N seconds#W'],
  '-이동',
  ['bx_tp_spawn','a','플레이어를 시작 지점으로 순간이동','teleport player to spawn'],
  ['bx_tp_xz','a','플레이어를 x [X#0:-9999:9999] z [Z#0:-9999:9999] 로 순간이동','teleport player to #X #Z'],
  ['bx_tp_rel','a','플레이어를 지금 위치에서 가로 [X#10:-999:999] 세로 [Z#0:-999:999] 만큼 순간이동','teleport player to ~#X ~#Z'],
  ['bx_tp_var','a','플레이어를 변수 위치로 순간이동 [V=pos1|bsv]','teleport player to %{#V}%']
]},
{id:'world',name:'월드·몬스터',colour:K.world,rows:[
  '-몬스터',
  ['bx_spawn','a','[M|'+MOBS+'] 소환 [N#1:1:99] 마리 플레이어 근처에','spawn #M #N times near player'],
  ['bx_spawn1','a','[M|'+MOBS+'] 한 마리 소환 [W|near player:플레이어~근처,at spawn:시작~지점]','spawn #M #W'],
  ['bx_killall','a','[M|'+MOBS+'] 모두 없애기','kill all #M'],
  ['bx_killnear','a','[M|'+MOBS+'] 모두 없애기 (플레이어 [N#30:1:999] 칸 안)','kill all #M in #N blocks of player'],
  ['bx_mobhp','a','[M|'+MOBS+'] 의 체력을 [N#30:1:99999] 로','set #M hp #N'],
  ['bx_coll_off','a','[M|tree:나무,rock:바위,ore:광석,water:물,block:블록] 와 부딪힘 끄기','disable collision of #M','통과할 수 있게 해요'],
  ['bx_coll_on','a','[M|tree:나무,rock:바위,ore:광석,water:물,block:블록] 와 부딪힘 켜기','enable collision of #M'],
  '-시간과 날씨',
  ['bx_time','a','시간을 [T|day:낮,night:밤] 으로','set time #T'],
  ['bx_timeN','a','시간을 [N#500:0:99999] 으로','set time #N'],
  ['bx_weather','a','날씨를 [T|rain:비,clear:맑음] 으로','set weather #T'],
  '-물건 놓고 지우기',
  ['bx_place','a','땅에 '+ITEM()+' 놓기 (시작 지점 근처)','place #I near spawn'],
  ['bx_place_p','a','땅에 '+ITEM()+' 놓기 (플레이어 위치)','place #I at player'],
  ['bx_place_xz','a','땅에 '+ITEM()+' 놓기 x [X#0:-9999:9999] z [Z#0:-9999:9999]','place #I at #X #Z'],
  ['bx_place_rel','a','땅에 '+ITEM()+' 놓기 (지금 위치에서 가로 [X#3:-99:99] 세로 [Z#0:-99:99])','place #I at ~#X ~#Z'],
  ['bx_removeall','a','[T|trees:나무,rocks:바위,ores:광석,structures:건물] 모두 지우기','remove all #T'],
  ['bx_removeall2','a','[T|trees:나무,rocks:바위,ores:광석,structures:건물] 지우기 (시작 지점 [N#50:1:999] 칸 안)','remove all #T in #N blocks of spawn'],
  ['bx_build','a','건물 [N=야영지|bs] 짓기 (플레이어 근처)','build ##N near player','"새 건물 만들기" 로 만든 건물을 지어요'],
  ['bx_build_at','a','건물 [N=야영지|bs] 짓기 (시작 지점에서 가로 [X#10:-999:999] 세로 [Z#20:-999:999])','build ##N at ~#X ~#Z'],
  '-땅 만들기 (월드를 만들 때만)',
  ['bx_fill','a','x [A#0:-9999:9999] z [B#0:-9999:9999] 부터 x [C#10:-9999:9999] z [D#10:-9999:9999] 까지 땅으로 채우기','fill ~#A ~#B ~#C ~#D to land'],
  ['bx_fill_b','a','x [A#0:-9999:9999] z [B#0:-9999:9999] 부터 x [C#10:-9999:9999] z [D#10:-9999:9999] 까지 땅으로 채우기 ([P#50:1:100]% 확률로 [O|'+BIOMES.replace('start:시작 섬,','')+'] 지역)','fill ~#A ~#B ~#C ~#D to land #O chance #P%']
]},
{id:'vars',name:'변수 (기억)',colour:K.vars,rows:[
  '-변수 값 정하기  (변수 = 값을 적어 두는 칸)',
  ['bx_set_n','a','변수 '+VAR+' 를 숫자 [N#0:-999999:999999] 로 정하기','set variable {{W:V}} to #N'],
  ['bx_set_s','a','변수 '+VAR+' 를 글자 [T=안녕|bs] 로 정하기','set variable {{W:V}} to ##T'],
  ['bx_set_rnd','a','변수 '+VAR+' 를 [A#1:-9999:9999] 부터 [B#10:-9999:9999] 사이 아무 수로','set variable {{W:V}} to random #A to #B'],
  ['bx_set_var','a','변수 '+VAR+' 를 변수 [X=other|bsv] 의 값으로','set variable {{W:V}} to variable {#X}'],
  ['bx_set_name','a','변수 '+VAR+' 를 플레이어 이름으로','set variable {{W:V}} to player name'],
  ['bx_set_ph','a','변수 '+VAR+' 를 [P|%player_location%:플레이어~위치,%player_hp%:플레이어~체력,%player_x%:플레이어~x,%player_z%:플레이어~z,%random_player%:아무~플레이어] 로','set variable {{W:V}} to #P'],
  ['bx_set_len','a','변수 '+VAR+' 를 변수 [X=other|bsv] 의 글자 수로','set variable {{W:V}} to length of variable {#X}'],
  ['bx_set_dist','a','변수 '+VAR+' 를 가장 가까운 몬스터까지의 거리로','set variable {{W:V}} to distance player to nearest monster'],
  '-변수 계산하기',
  ['bx_add','a','변수 '+VAR+' 에 [N#1:-999999:999999] 더하기','add #N to variable {{W:V}}'],
  ['bx_sub','a','변수 '+VAR+' 에서 [N#1:-999999:999999] 빼기','subtract #N from variable {{W:V}}'],
  ['bx_mul','a','변수 '+VAR+' 에 [N#2:-999999:999999] 곱하기','multiply variable {{W:V}} by #N'],
  ['bx_div','a','변수 '+VAR+' 를 [N#2:-999999:999999] 로 나누기','divide variable {{W:V}} by #N'],
  ['bx_append','a','변수 '+VAR+' 뒤에 글자 [T=!|bs] 붙이기','append ##T to variable {{W:V}}'],
  ['bx_reset','a','변수 '+VAR+' 지우기','reset variable {{W:V}}']
]},
{id:'logic',name:'조건·반복',colour:K.logic,rows:[
  '-만약 …이면 (아니면 칸은 비워도 돼요)',
  ['bx_if_var','a','만약 변수 '+VAR+' 가 [O|'+OPS+'] [N#0:-999999:999999] 이면 {BODY:BSA} 아니면 {ELSE:BSA}','if variable {{W:V}} #O #N:\n%B%?ELSE'],
  ['bx_if_set','a','만약 변수 '+VAR+' 에 값이 있으면 {BODY:BSA} 아니면 {ELSE:BSA}','if variable {{W:V}} is set:\n%B%?ELSE'],
  ['bx_if_notset','a','만약 변수 '+VAR+' 에 값이 없으면 {BODY:BSA} 아니면 {ELSE:BSA}','if variable {{W:V}} is not set:\n%B%?ELSE'],
  ['bx_if_has','a','만약 '+ITEM()+' 를 [N#1:1:9999] 개 가지고 있으면 {BODY:BSA} 아니면 {ELSE:BSA}','if has #N #I:\n%B%?ELSE'],
  ['bx_if_hp','a','만약 플레이어 체력이 [O|'+OPS+'] [N#10:0:999] 이면 {BODY:BSA} 아니면 {ELSE:BSA}','if player hp #O #N:\n%B%?ELSE'],
  ['bx_if_time','a','만약 지금이 [T|day:낮,night:밤] 이면 {BODY:BSA} 아니면 {ELSE:BSA}','if time is #T:\n%B%?ELSE'],
  ['bx_if_rain','a','만약 비가 오면 {BODY:BSA} 아니면 {ELSE:BSA}','if weather is rain:\n%B%?ELSE'],
  ['bx_if_inv','a','만약 가방이 [T|full:가득~찼으면,empty:비었으면] {BODY:BSA} 아니면 {ELSE:BSA}','if inventory is #T:\n%B%?ELSE'],
  ['bx_if_hand','a','만약 손에 '+ITEM()+' 를 들고 있으면 {BODY:BSA} 아니면 {ELSE:BSA}','if #I in player_hand:\n%B%?ELSE'],
  ['bx_if_hand_my','a','만약 손에 내 아이템 [I=내~아이템|bs] 를 들고 있으면 {BODY:BSA} 아니면 {ELSE:BSA}','if ##I in player_hand:\n%B%?ELSE'],
  ['bx_if_biome','a','만약 플레이어가 [B|'+BIOMES+'] 지역에 있으면 {BODY:BSA} 아니면 {ELSE:BSA}','if player biome is #B:\n%B%?ELSE'],
  ['bx_if_world','a','만약 월드의 [T|day:날짜,players:접속자~수] 가 [O|'+OPS+'] [N#1:0:99999] 이면 {BODY:BSA} 아니면 {ELSE:BSA}','if world #T #O #N:\n%B%?ELSE'],
  ['bx_if_key','a','만약 [K|'+KEYS+'] 키를 누르고 있으면 {BODY:BSA} 아니면 {ELSE:BSA}','if key "#K" press:\n%B%?ELSE'],
  ['bx_if_attacker','a','만약 때린 쪽이 플레이어이면 {BODY:BSA} 아니면 {ELSE:BSA}','if %attacker% is player:\n%B%?ELSE'],
  '-확률과 되풀이',
  ['bx_chance','a','[N#30:1:100]% 확률로 {BODY:BSA} 아니면 {ELSE:BSA}','chance #N%:\n%B%?ELSE'],
  ['bx_loop','a','[N#3:1:999] 번 되풀이 {BODY:BSA}','loop #N times:\n%B'],
  '-기다리기와 멈추기',
  ['bx_wait','a','[N#1:0.1:3600] 초 기다리기','wait #N seconds'],
  ['bx_stop','a','여기서 멈추기','stop'],
  ['bx_cancel','a','원래 일어날 일 취소하기','cancel event','클릭·놓기·만들기·먹기·다치기·F키 사건 안에서만 쓸 수 있어요']
]},
{id:'defitem',name:'새 아이템 만들기',colour:K.def,rows:[
  '-아이템 하나를 정의해요 (안에 속성 블록을 끼워 넣어요)',
  ['bx_d_item','e','새 아이템 [N=내~아이템|bs] {BODY:BSP}','define item ##N:\n%B\n'],
  ['bx_i_base','p:BSP','바탕 아이템 [I|'+ITEMS+']','base #I','이 아이템이 어떤 아이템을 바탕으로 만들어지는지 골라요'],
  ['bx_i_image','p:BSP,BSM','그림 이름 [T=my_image|key]','image: ##T','게임 그림 이름이에요'],
  ['bx_i_recipe','p:BSP','제작법: [A|'+ITEMS+'] [N#3:1:99] 개 + [B|'+ITEMS+'] [M#2:1:99] 개','recipe #A #N, #B #M'],
  ['bx_i_maxcount','p:BSP','한 칸에 최대 [N#99:1:9999] 개','max_item_count: #N'],
  ['bx_i_wear','p:BSP','입을 수 있어요: [W|'+WEAR+']','wearable: #W'],
  ['bx_i_bag','p:BSP','가방 칸 [N#14:1:99] 개 늘려요','add_inventory: #N'],
  ['bx_i_eat','p:BSP','먹을 수 있어요','eatable: true'],
  ['bx_i_heal','p:BSP','먹으면 체력 [N#6:1:999] 회복','heal: #N'],
  ['bx_i_effect','p:BSP','먹으면 [E|'+EFFECTS+'] 효과 [N#90:1:3600] 초','effect: #E #N'],
  ['bx_i_held','p:BSP','손에 들면 [E|'+HELD+'] 효과','held: #E'],
  '-무기 (weapon)',
  ['bx_i_weapon','p:BSP','무기 설정 {BODY:BSWP}','weapon:\n%B'],
  ['bx_wp_on','p:BSWP','무기로 쓸 수 있어요','weaponable: true'],
  ['bx_wp_dmg','p:BSWP','공격력 [N#10:1:9999]','item_damage: #N'],
  ['bx_wp_spd','p:BSWP','공격 속도 [N#0.3:0.05:5] (작을수록 빨라요)','item_attack_speed: #N'],
  '-놓을 수 있는 아이템 (place)',
  ['bx_i_place','p:BSP','놓기 설정 {BODY:BSPL}','place:\n%B'],
  ['bx_pl_on','p:BSPL','놓을 수 있어요','placeable: true'],
  ['bx_pl_img','p:BSPL','놓았을 때 그림 [T=my_image|key]','placed_image: ##T'],
  '-도구 (tool)',
  ['bx_i_tool','p:BSP','도구 설정 {BODY:BSTL}','tool:\n%B'],
  ['bx_tl_on','p:BSTL','도구로 쓸 수 있어요','toolable: true'],
  ['bx_tl_max','p:BSTL','내구도 [N#100:1:99999]','max_damage: #N']
]},
{id:'defmob',name:'새 몬스터·광석·땅',colour:K.mob,rows:[
  '-몬스터 하나를 정의해요',
  ['bx_d_mob','e','새 몬스터 [N=내~몬스터|bs] {BODY:BSM}','define mob ##N:\n%B\n'],
  ['bx_m_base','p:BSM','바탕 몬스터 [M|'+MOBS+']','base #M'],
  ['bx_m_hp','p:BSM','체력 [N#30:1:99999]','hp #N'],
  ['bx_m_dmg','p:BSM','공격력 [N#4:1:9999]','dmg #N'],
  ['bx_m_speed','p:BSM','속도 [N#1.2:0.1:10]','speed #N'],
  ['bx_m_color','p:BSM','색깔 [C=#ff7a2e|hex]','color ##C'],
  ['bx_m_hostile','p:BSM','플레이어를 공격해요','hostile player'],
  ['bx_m_drop','p:BSM','죽으면 '+ITEM()+' [A#1:0:999] ~ [B#2:0:999] 개 떨어뜨려요','drop #I #A #B'],
  ['bx_m_rate','p:BSM','나타나는 확률 [N#4:1:100]','rate #N'],
  ['bx_m_spawn','p:BSM','자연스럽게 나타나요 {BODY:BSSP}','spawn:\n%B'],
  ['bx_sp_on','p:BSSP','자연 소환 켜기','natural_spawnable: true'],
  ['bx_sp_biome','p:BSSP','나타나는 지역 [B|'+BIOMES+']','biome: #B'],
  ['bx_sp_max','p:BSSP','한 번에 최대 [N#3:1:99] 마리','max_spawn_count: #N'],
  '-광석 하나를 정의해요',
  ['bx_d_ore','e','새 광석 [N=내~광석|bs] {BODY:BSO}','define ore ##N:\n%B\n'],
  ['bx_o_base','p:BSO','바탕 광석 [O|'+ORES+']','base #O'],
  ['bx_o_color','p:BSO','색깔 [C=#ff5a1e|hex]','color ##C'],
  ['bx_o_drop','p:BSO','캐면 '+ITEM()+' [A#2:0:999] ~ [B#3:0:999] 개','drop #I #A #B'],
  ['bx_o_biome','p:BSO','나오는 지역 [B|'+BIOMES+']','biome #B'],
  ['bx_o_chance','p:BSO','나올 확률 [N#4:1:100]','chance #N'],
  '-건물 하나를 정의해요',
  ['bx_d_st','e','새 건물 [N=야영지|bs] {BODY:BSS}','define structure ##N:\n%B\n','"건물 짓기" 블록으로 지을 수 있어요'],
  ['bx_st_block','p:BSS','칸 '+ITEM()+' (가로 [X#0:-99:99] 세로 [Z#0:-99:99])','block #I #X #Z'],
  ['bx_st_my','p:BSS','칸 내 아이템 [I=내~아이템|bs] (가로 [X#0:-99:99] 세로 [Z#0:-99:99])','block ##I #X #Z'],
  '-새 지역(바이옴) 하나를 정의해요',
  ['bx_d_biome','e','새 지역 [N=내~지역|bs] {BODY:BSB}','define biome ##N:\n%B\n'],
  ['bx_b_base','p:BSB','바탕 지역 [B|'+BIOMES+']','base #B'],
  ['bx_b_ground','p:BSB','땅 색깔 [C=#e3eef7|hex]','ground ##C'],
  ['bx_b_trees','p:BSB','나무 종류 [B|'+BIOMES+']','trees #B'],
  ['bx_b_mob','p:BSB','몬스터 [N=내~몬스터|bs] 최대 [M#3:1:99] 마리 확률 [R#5:1:100]','mob ##N max #M rate #R']
]},
{id:'win',name:'창 만들기',colour:K.win,rows:[
  '-창 하나를 정의해요 (글자·입력칸·버튼을 넣어요)',
  ['bx_d_win','e','새 창 [N=내~창|bs] {BODY:BSW}','defined window ##N:\n%B\n','"창 열기" 블록으로 열어요'],
  ['bx_w_text','w','글자 [T=여기에~글을~써요|bs]','text ##T'],
  ['bx_w_input','w','입력칸 [T=이름|bs] 의 값을 변수 [V=name|bsv] 에 담기','input ##T into {#V}'],
  ['bx_w_btn','w','버튼 [T=확인|bs] 위치 [P|center:가운데,bottom right:오른쪽~아래,bottom left:왼쪽~아래] 누르면 {BODY:BSA}','button ##T at #P:\n%B'],
  ['bx_w_btnc','w','버튼 [T=확인|bs] 위치 [P|center:가운데,bottom right:오른쪽~아래,bottom left:왼쪽~아래] 색 [C=#2a8f5a|hex] 누르면 {BODY:BSA}','button ##T at #P color ##C:\n%B'],
  '-창이 열려 있는 동안 바꾸기',
  ['bx_addinput','a','입력칸 [T=이름|bs] 늘리기 (값은 변수 [V=name|bsv])','add input ##T into {#V}'],
  ['bx_rminput','a','입력칸 [T=이름|bs] 없애기','remove input ##T']
]},
{id:'sig',name:'다른 모드와 소통',colour:K.sig,rows:[
  '-신호 보내기 (받는 쪽은 "신호를 받으면")',
  ['bx_sig','a','신호 [T=hello|bs] 값 [V=1|bs] 를 모드 [M=potato~api|bs] 에게 보내기','signal send ##T ##V to mod ##M'],
  ['bx_sig2','a','신호 [T=hello|bs] 를 모드 [M=potato~api|bs] 에게 보내기','signal send ##T to mod ##M']
]}
];

var byId={}; cats.forEach(function(c){ byId[c.id]=c; });
byId.vars2={id:'vars2',name:'변수·함수',colour:K.vars,custom:'LVARS',rows:[]};
var ORDER=['mod','ev','say','item','world','vars','logic','defitem','defmob','win','sig'];
BL.add('bs',{cats:ORDER.map(function(id){ return byId[id]; }),
  starter:function(X){ X.top([X.b('bx_on_join',null,null,{BODY:[X.b('bx_chat',{T:'어서 와요!'}),X.b('bx_give',{I:'sword_iron',N:1})]})]); },
  examples:[
  {name:'환영 인사',desc:'들어오면 인사하고 검을 줘요',build:function(X){ X.top([X.b('bx_on_join',null,null,{BODY:[X.b('bx_title',{T:'어서 와요!'}),X.b('bx_chat',{T:'%player_name% 님, 환영해요'}),X.b('bx_give',{I:'sword_stone',N:1})]})]); }},
  {name:'밤마다 늑대',desc:'밤이 되면 늑대가 나타나요',build:function(X){ X.top([X.b('bx_on_night',null,null,{BODY:[X.b('bx_broadcast',{T:'밤이 왔어요! 늑대를 조심하세요'}),X.b('bx_spawn',{M:'wolf',N:3})]})],30,30); X.top([X.b('bx_on_day',null,null,{BODY:[X.b('bx_broadcast',{T:'아침이에요'}),X.b('bx_killall',{M:'wolf'})]})],30,300); }},
  {name:'G키 회복 (쿨타임)',desc:'G를 누르면 체력을 채워요',build:function(X){ X.top([X.b('bx_on_keycd',{K:'G',S:10},null,{BODY:[X.b('bx_heal',{N:20}),X.b('bx_effect',{E:'speed',N:5}),X.b('bx_chat',{T:'힘이 솟아요!'}),X.b('bx_sound',{S:'hurt'})]})]); }},
  {name:'점수 올리기',desc:'변수와 화면 글씨를 써요',build:function(X){ X.top([X.b('bx_on_join',null,null,{BODY:[X.b('bx_set_n',{W:'n',V:'score',N:0}),X.b('bx_hud',{P:'top left',T:'점수 %{score}%'})]})],30,30); X.top([X.b('bx_on_kill',{M:''},null,{BODY:[X.b('bx_add',{W:'n',V:'score',N:1}),X.b('bx_hudclr'),X.b('bx_hud',{P:'top left',T:'점수 %{score}%'})]})],30,300); }},
  {name:'새 검 만들기',desc:'내 이름의 아이템과 무기 설정',build:function(X){ X.top([X.b('bx_mod',{N:'불꽃 모드'})],30,30); X.top([X.b('bx_d_item',{N:'불꽃 검'},null,{BODY:[X.b('bx_i_base',{I:'sword_iron'}),X.b('bx_i_image',{T:'flame_sword'}),X.b('bx_i_recipe',{A:'iron',N:3,B:'log',M:2}),X.b('bx_i_weapon',null,null,{BODY:[X.b('bx_wp_on'),X.b('bx_wp_dmg',{N:20}),X.b('bx_wp_spd',{N:0.3})]})]})],30,130); }},
  {name:'새 몬스터 만들기',desc:'숲에 나타나는 몬스터',build:function(X){ X.top([X.b('bx_d_mob',{N:'불씨늑대'},null,{BODY:[X.b('bx_m_base',{M:'wolf'}),X.b('bx_i_image',{T:'wolf'}),X.b('bx_m_hp',{N:30}),X.b('bx_m_dmg',{N:4}),X.b('bx_m_speed',{N:1.3}),X.b('bx_m_color',{C:'#ff7a2e'}),X.b('bx_m_drop',{I:'iron',A:1,B:2}),X.b('bx_m_rate',{N:4}),X.b('bx_m_spawn',null,null,{BODY:[X.b('bx_sp_on'),X.b('bx_sp_biome',{B:'forest'}),X.b('bx_sp_max',{N:3})]})]})]); }},
  {name:'확인 창 만들기',desc:'버튼이 있는 창을 열어요',build:function(X){ X.top([X.b('bx_d_win',{N:'안내'},null,{BODY:[X.b('bx_w_text',{T:'환영합니다!'}),X.b('bx_w_btn',{T:'받기',P:'center'},null,{BODY:[X.b('bx_give',{I:'bread',N:3}),X.b('bx_closewin')]})]})],30,30); X.top([X.b('bx_on_key',{K:'M'},null,{BODY:[X.b('bx_openwin',{N:'안내'})]})],30,330); }}
  ]});
})();
