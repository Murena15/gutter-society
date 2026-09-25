emailjs.init("YOUR_PUBLIC_KEY");

const form = document.getElementById("contactForm");

form.addEventListener("submit", function(e){

    e.preventDefault();

    emailjs.send(

        "YOUR_SERVICE_ID",

        "YOUR_TEMPLATE_ID",

        {

            from_name:
                document.getElementById("name").value,

            from_email:
                document.getElementById("email").value,

            subject:
                document.getElementById("subject").value,

            message:
                document.getElementById("message").value

        }

    )

    .then(function(){

        alert("Message sent successfully!");

        form.reset();

    })

    .catch(function(error){

        alert("Something went wrong.");

        console.log(error);

    });

});