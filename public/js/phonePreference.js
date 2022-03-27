window.onload = function(){

    var phones
    var likedPhones =[]
    function fillData(data){
        var indexes =[]
        indexes[0] = parseInt(Math.random()*166)
        indexes[1] = 166+parseInt(Math.random()*166)
        indexes[2] = 332+parseInt(Math.random()*166)
        indexes[3] = 498+parseInt(Math.random()*166)
        indexes[4] = 664+parseInt(Math.random()*166)
        indexes[5] = 830+parseInt(Math.random()*166)
        for(var index in indexes){
            $(".card").eq(index).find("#price").text("$ "+data[indexes[index]].price)
            $(".card").eq(index).find(".title").text(data[indexes[index]].modelname)
            $(".card").eq(index).find("#storage").text(data[indexes[index]].storage)
            $(".card").eq(index).find("#memory").text(data[indexes[index]].ram)
            $(".card").eq(index).find("#os").text(data[indexes[index]].os1)
            $(".card").eq(index).find("#camera").text(data[indexes[index]].cam1+" MP")
            $(".card").eq(index).find("#screen").text(data[indexes[index]].displaysize+" inches")
            $(".card").eq(index).find("#resolution").text(data[indexes[index]].resolution1+"*"+data[indexes[index]].resolution2)
            $(".card").eq(index).find("#battery").text(data[indexes[index]].battery+" mAh")
            $(".card").eq(index).find("a").attr("href",data[indexes[index]].url)
            $(".card").eq(index).find("img").attr("src",data[indexes[index]].img)
            $(".card-container").eq(index).attr("data",indexes[index])
        }
    }
    $.getJSON("../js/newPhone.json",function(data){
        console.log(data)
        phones = data.pool
        fillData(phones)
    })
    $(".fa").click(function () {
        if(likedPhones.length==3 && !$(this).hasClass("fa-heart")){
            alert("You have selected 3 phones, please click the Submit button to proceed.")
        }else if(likedPhones.length==3 && $(this).hasClass("fa-heart")){
            $(this).removeClass("fa-heart")
            $(this).addClass("fa-heart-o")
            var removedIndex = likedPhones.indexOf($(this).parent().attr("data"))
            likedPhones.splice(removedIndex,1)
        }
        else{
            if($(this).hasClass("fa-heart-o")){
                $(this).removeClass("fa-heart-o")
                $(this).addClass("fa-heart")
                likedPhones.push($(this).parent().attr("data"))
            }
            else if($(this).hasClass("fa-heart")){
                $(this).removeClass("fa-heart")
                $(this).addClass("fa-heart-o")
                var removedIndex = likedPhones.indexOf($(this).parent().attr("data"))
                likedPhones.splice(removedIndex,1)
            }
            else if($(this).hasClass("fa-refresh")){
                fillData(phones)
            }
        }
        console.log(likedPhones)
    })




    $("#startchat").on("click", function(){
        //TODO: pass the user preference data to backend to generate recommendations
        window.location.href='/index';

    })

}