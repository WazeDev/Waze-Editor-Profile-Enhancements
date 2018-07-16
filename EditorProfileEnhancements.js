// ==UserScript==
// @name         Waze Editor Profile Enhancements
// @namespace    http://tampermonkey.net/
// @version      2018.07.15.01
// @description  Pulls the correct forum post count - changed to red to signify the value as pulled from the forum by the script
// @author       JustinS83
// @include      https://www.waze.com/*user/editor*
// @include      https://beta.waze.com/*user/editor*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    var nawkts, rowwkts, ilwkts = [];
    var combinedNAWKT, combinedROWWKT, combinedILWKT= "";
    var naMA, rowMA, ilMA;

    function bootstrap(tries) {
        tries = tries || 1;

        if (W &&
            W.EditorProfile &&
            $) {
            init();
        } else if (tries < 1000) {
            setTimeout(function () {bootstrap(tries++);}, 200);
        }
    }

    bootstrap();

    async function init(){
        $.get('https://www.waze.com/forum/memberlist.php?username=' + W.EditorProfile.data.username, function(forumResult){
            var re = 0;
            var matches = forumResult.match(/<a.*?"Search user’s posts">(\d+)<\/a>/);
            if(matches && matches.length > 0)
                re = matches[1];
            var WazeVal = $('#header > div > div.user-info > div > div.user-highlights > div > div:nth-child(3) > div.user-stats-value')[0].innerHTML.trim();
            var userForumID = forumResult.match(/<a href="\.\/memberlist\.php\?mode=viewprofile&amp;u=(\d+)"/)[1];

            $('#header > div > div.user-info > div > div.user-highlights > div > div:nth-child(3) > div.highlight-title').css('position', 'relative');

            if(WazeVal !== re.toString()){
                $('#header > div > div.user-info > div > div.user-highlights > div > div:nth-child(3) > div.user-stats-value')[0].innerHTML = re;
                $('#header > div > div.user-info > div > div.user-highlights > div > div:nth-child(3) > div.user-stats-value').css('color','red');
                $('#header > div > div.user-info > div > div.user-highlights > div > div:nth-child(3) > div.user-stats-value').prop('title', 'Waze reported value: ' + WazeVal);
            }

            $('#header > div > div.user-info > div > div.user-highlights > div > div:nth-child(3)').wrap('<a href="https://www.waze.com/forum/search.php?author_id=' + userForumID + '&sr=posts" targ="_blank"></a>');

            $('#header > div > div.user-info > div > div.user-highlights > a').prepend('<a href="https://www.waze.com/forum/memberlist.php?mode=viewprofile&u=' + userForumID +'" target="_blank" style="margin-right:5px;"><button class="message s-modern-button s-modern"><i class="fa fa-user"></i><span>Forum Profile</span></button></a>');
        });

        var count = 0;
        W.EditorProfile.data.editingActivity.forEach(function(x) { if(x !== 0) count++; });
        $('#editing-activity > div > h3').append(" (" + count + " of last 91 days)");

        await getManagedAreas();

        if(naMA.managedAreas.length > 0 || rowMA.managedAreas.length > 0 || ilMA.managedAreas.length > 0){
            $('#header > div > div.user-info > div > div.user-highlights > a').append('<a href="#" title="View editor\'s managed areas in WKT format"><button class="message s-modern-button s-modern" id="userMA"><i class="fa fa-map-o" aria-hidden="true"></i></button></a>');

            $('#userMA').click(function(){
                if($('#wpeWKT').css('visibility') === 'visible')
                    $('#wpeWKT').css({'visibility': 'hidden'});
                else
                    $('#wpeWKT').css({'visibility': 'visible'});
            });

            var result = buildWKTArray(naMA);
            nawkts = result.wktArr;
            combinedNAWKT = result.combinedWKT;

            result = buildWKTArray(rowMA);
            rowwkts = result.wktArr;
            combinedROWWKT = result.combinedWKT;

            result = buildWKTArray(ilMA);
            ilwkts = result.wktArr;
            combinedILWKT = result.combinedWKT;

            var $section = $("<div>", {style:"padding:8px 16px"});
            $section.html([
                '<div id="wpeWKT" style="padding:8px 16px; position:fixed; border-radius:10px; box-shadow:5px 5px 10px 4px Silver; top:25%; left:40%; background-color:white; visibility:hidden;">', //Main div
                '<div style="float:right; cursor:pointer;" id="wpeClose"><i class="fa fa-window-close" aria-hidden="true"></i></div>',
                '<ul class="nav nav-tabs">',
                `${naMA.managedAreas.length > 0 ? '<li class="active"><a data-toggle="pill" href="#naAreas">NA</a></li>' : ''}`,
                `${rowMA.managedAreas.length > 0 ? '<li><a data-toggle="pill" href="#rowAreas">ROW</a></li>' : ''}`,
                `${ilMA.managedAreas.length > 0 ? '<li><a data-toggle="pill" href="#ilAreas">IL</a></li>' : ''}`,
                '</ul>',
                '<div class="tab-content">',
                '<div id="naAreas" class="tab-pane fade in active">',
                '<div id="wpenaAreas" style="float:left;"><h3 style="float:left; left:50%;">Editor Areas</h3><br>' + buildAreaList(nawkts,"na") + '</div>',
                '<div id="wpenaPolygons" style="float:left; padding-left:15px;"><h3 style="position:relative; float:left; left:40%;">Area WKT</h3><br><textarea rows="7" cols="55" id="wpenaAreaWKT" style="height:auto;"></textarea></div>',
                '</div>',//naAreas
                '<div id="rowAreas" class="tab-pane fade">',
                '<div id="wperowAreas" style="float:left;"><h3 style="float:left; left:50%;">Editor Areas</h3><br>' + buildAreaList(rowwkts, "row") + '</div>',
                '<div id="wperowPolygons" style="float:left; padding-left:15px;"><h3 style="position:relative; float:left; left:40%;">Area WKT</h3><br><textarea rows="7" cols="55" id="wperowAreaWKT" style="height:auto;"></textarea></div>',
                '</div>',//rowAreas
                '<div id="ilAreas" class="tab-pane fade">',
                '<div id="wpeilAreas" style="float:left;"><h3 style="float:left; left:50%;">Editor Areas</h3><br>' + buildAreaList(ilwkts, "il") + '</div>',
                '<div id="wpeilPolygons" style="float:left; padding-left:15px;"><h3 style="position:relative; float:left; left:40%;">Area WKT</h3><br><textarea rows="7" cols="55" id="wpeilAreaWKT" style="height:auto;"></textarea></div>',
                '</div>',//ilAreas
                '<div id="wpeFooter" style="clear:both; margin-top:10px;">View the areas by entering the WKT at <a href="http://map.wazedev.com" target="_blank">http://map.wazedev.com</a></div>',
                '</div>', //tab-content
                '</div>' //end main div
            ].join(' '));

            $('body').append($section.html());

            $('[id^="wpenaAreaButton"]').click(function(){
                let index = parseInt($(this)[0].id.replace("wpenaAreaButton", ""));
                $('#wpenaAreaWKT').text(nawkts[index]);
                $('#wpenaPolygons > h3').text(`Area ${index+1} WKT`);
            });

            $('[id^="wperowAreaButton"]').click(function(){
                let index = parseInt($(this)[0].id.replace("wperowAreaButton", ""));
                $('#wperowAreaWKT').text(rowwkts[index]);
                $('#wperowPolygons > h3').text(`Area ${index+1} WKT`);
            });

            $('[id^="wpeilAreaButton"]').click(function(){
                let index = parseInt($(this)[0].id.replace("wpeilAreaButton", ""));
                $('#wpeilAreaWKT').text(ilwkts[index]);
                $('#wpeilPolygons > h3').text(`Area ${index+1} WKT`);
            });

            $('#wpenaCombinedAreaButton').click(function(){
                $('#wpenaAreaWKT').text(combinedNAWKT);
                $('#wpenaPolygons > h3').text(`Combined Area WKT`);
            });

            $('#wperowCombinedAreaButton').click(function(){
                $('#wperowAreaWKT').text(combinedROWWKT);
                $('#wperowPolygons > h3').text(`Combined Area WKT`);
            });

            $('#wpeilCombinedAreaButton').click(function(){
                $('#wpeilAreaWKT').text(combinedILWKT);
                $('#wpeilPolygons > h3').text(`Combined Area WKT`);
            });

            $('#wpeClose').click(function(){
                if($('#wpeWKT').css('visibility') === 'visible')
                    $('#wpeWKT').css({'visibility': 'hidden'});
                else
                    $('#wpeWKT').css({'visibility': 'visible'});
            });
        }
    }

    function buildAreaList(wkts, server){
        let html = "";
        for(let i=0; i<wkts.length; i++){
            html +=`<button id="wpe${server}AreaButton${i}" class="btn btn-outline-primary" style="margin-bottom:5px;">Area ${i+1}</button><br>`;
        }
        if(wkts.length > 1)
            html +=`<button id="wpe${server}CombinedAreaButton" class="btn btn-outline-primary" style="margin-bottom:5px;">Combined</button><br>`;
        return html;
    }

    function buildWKTArray(wktObj){
        let wkt = "";
        let combined = "";
        let wktArr = [];
        for(let i=0; i<wktObj.managedAreas.length; i++){
            if(i>0)
                combined += ",";
            wkt = "";
            combined += "(";
            for(let j=0; j<wktObj.managedAreas[i].coordinates.length; j++){
                if(j>0){
                    wkt += ",";
                    combined += ",";
                }
                combined += "(";
                wkt +="(";
                for(let k=0; k<wktObj.managedAreas[i].coordinates[j].length; k++){
                    if(k > 0){
                        wkt+=", ";
                        combined += ",";
                    }
                    wkt += round(parseFloat(wktObj.managedAreas[i].coordinates[j][k][0])).toString() + " " + round(parseFloat(wktObj.managedAreas[i].coordinates[j][k][1])).toString();
                    combined += round(parseFloat(wktObj.managedAreas[i].coordinates[j][k][0])).toString() + " " + round(parseFloat(wktObj.managedAreas[i].coordinates[j][k][1])).toString();
                }
                combined += ")";
                wkt += ")";
            }
            combined += ")";
            wkt = `POLYGON${wkt}`;
            wktArr.push(wkt);
        }
        if(wktObj.managedAreas.length > 1)
            combined = `MULTIPOLYGON(${combined})` ;
        else
            combined = `POLYGON${combined}`;

        return {wktArr: wktArr, combinedWKT: combined};
    }

    function round(val){
        return Math.round(val*1000000)/1000000;
    }

    async function getManagedAreas(){
        naMA = await $.get(`https://www.waze.com/Descartes/app/UserProfile/Areas?userID=${W.EditorProfile.data.userID}`);
        rowMA = await $.get(`https://www.waze.com/row-Descartes/app/UserProfile/Areas?userID=${W.EditorProfile.data.userID}`);
        ilMA = await $.get(`https://www.waze.com/il-Descartes/app/UserProfile/Areas?userID=${W.EditorProfile.data.userID}`);

        /*return await new W.EditorProfile.Models.ManagedAreas([],{
                lastEditEnv: 'na',
                userId: W.EditorProfile.data.userID
            }).fetch();*/
    }
})();
