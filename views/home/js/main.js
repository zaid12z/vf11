$('.hexagon').fadeIn()

let Web = {
    Notify: (type, title, body, time) => {
        const notifyId = `notify-${Date.now()}`; // Generate a unique ID
        let icon = '<i class="fa-solid fa-check" style="color:rgb(105, 255, 168)"></i>'

        if (type == "error") {
            icon = '<i class="fa-solid fa-xmark" style="color:rgb(255, 148, 148)"></i>'
        } else if (type == "info") {
            icon = '<i class="fa-solid fa-info" style="color:rgb(255, 255, 255)"></i>'

        } else if (type == "warn") {
            icon = '<i class="fa-solid fa-warning" style="color:rgb(255, 204, 146)"></i>'
        }

        $('.notifys').append(`
            <div class="notify notify-${notifyId}" style="position: relative; right: -100%; opacity: 0;">
                <div class="not-left">
                    <div class="not-icon">
                    ${icon}
                    </div>
                </div>
                <div class="not-right">
                    <div class="title">
                        <p>${title}</p>
                    </div>
                    <div class="body">
                        <p>${body}</p>
                    </div>
                </div>
            </div>
        `)
        $(`.notify-${notifyId}`).animate({
            right: '0%',
            opacity: 1
        }, 600);

        setTimeout(() => {
            $(`.notify-${notifyId}`).animate({
                right: '-=100%',
                opacity: 0
            }, 600, function() {
                $(this).remove();
            });
        }, time);
    }
}
$(document).on("click", ".menu-show", () => {
    if ($(".header-intraction .main-items").css("display") == "block") {
        $(".header-intraction .main-items").css("display", "none")
    } else {
        $(".header-intraction .main-items").css("display", "block")
    }
});

$(document).on("click", ".logout-btn", (data) => {

    const csrfToken = ""; // Replace this with the actual CSRF token

    $.ajax({
        url: '/get-csrf-token',
        type: 'GET',
        success: function(response) {
            const csrfToken = response.csrfToken; // Now csrfToken is initialized

            $.ajax({
                url: '/api/logout',
                type: 'POST',
                headers: {
                    'X-CSRF-Token': csrfToken // Add the CSRF token to the headers
                },
                data: {

                },
                success: function(response) {
                    if (response.success) {
                        Web.Notify('success', 'نجاح', response.message, 4000);
                        setTimeout(() => {
                            location.reload();
                        }, 3000);
                    } else {
                        Web.Notify('error', 'خطأ', response.message, 4000);
                    }
                },
                error: function(xhr, status, error) {
                    Web.Notify('error', 'خطأ', 'Something went wrong', 4000);
                }
            });

        },
        error: function(xhr, status, error) {
            console.error('Error fetching CSRF token:', error);
        }
    });
})

document.querySelectorAll('.intract').forEach(e => {
    if (e.dataset.page == $('.current-page').data('current')) {
        $(e).addClass("active");
    } else {
        $(e).removeClass("active");
    }
});

const serversButton = document.getElementById('servers-button');
const serversMenu = document.getElementById('servers-menu');

$(document).on("click", "#servers-button", function(event) {
    event.preventDefault();

    $('#servers-menu').css("display", $('#servers-menu').css("display") === 'none' ? 'block' : 'none')
})

$(document).on("click", "#users-button", function(event) {
    event.preventDefault();

    $('#users-menu').css("display", $('#users-menu').css("display") === 'none' ? 'block' : 'none')
})

$(document).on("click", "#more-button", function(event) {
    event.preventDefault();

    $('#more-menu').css("display", $('#more-menu').css("display") === 'none' ? 'block' : 'none')
})

document.addEventListener('click', function(event) {
    if (!document.querySelector('#servers-button').contains(event.target) && !document.querySelector('#servers-menu').contains(event.target)) {
        $('#servers-menu').css("display", "none")
    }

    if (document.querySelector('#users-button')) {
        if (!document.querySelector('#users-button').contains(event.target) && !document.querySelector('#users-menu').contains(event.target)) {
            $('#users-menu').css("display", "none")
        }
    }
    if (document.querySelector('#more-button')) {
        if (!document.querySelector('#more-button').contains(event.target) && !document.querySelector('#more-menu').contains(event.target)) {
            $('#more-menu').css("display", "none")
        }
    }
});

let isExpanded = true; // Track the state of the right side

$(document).on("click", ".claps", function(e) {
    const rightside = $('.account-rightside');

    if (isExpanded) {
        rightside.css("width", "40px")
        document.querySelectorAll('.account-page').forEach(element => {
            $(element).animate({
                right: "-160px"
            }, 300);
        });
        isExpanded = false
    } else {
        rightside.css("width", "250px")
        document.querySelectorAll('.account-page').forEach(element => {
            $(element).animate({
                right: "0px"
            }, 300);
        });
        isExpanded = true
    }

});
$(document).on("click", ".account-page", function(e) {
    const page = e.currentTarget.dataset.page
    if (page) {
        document.querySelectorAll('.account-body-page').forEach(element => {
            if (page == element.dataset.page) {
                $(element).css("display", "block")
            } else {
                $(element).css("display", "none")
            }
        });
    }
})

$(document).on("click", ".link-discord", function(e) {
    window.location.href = '/api/oauth'; // Redirect to the OAuth route
})


$(document).on("click", ".remover-link-discord", function(e) {
    $.ajax({
        url: '/get-csrf-token',
        type: 'GET',
        success: function(response) {
            const csrfToken = response.csrfToken; // Correctly initialize csrfToken

            // Prepare login data, including recaptchaToken
            const formData = {};

            // Perform login AJAX request
            $.ajax({
                url: '/api/unlink_discord',
                type: 'POST',
                headers: {
                    'X-CSRF-Token': csrfToken // Add CSRF token in headers
                },
                data: formData, // Send the formData object (contains username, password, and recaptchaToken)
                success: function(response) {
                    if (response.success) {
                        Web.Notify('success', 'نجاح', response.message, 4000);
                        setTimeout(() => {
                            location.reload(); // Reload after success
                        }, 2000);
                    } else {
                        Web.Notify('error', 'خطأ', response.message, 4000);
                    }
                },
                error: function(xhr, status, error) {
                    Web.Notify('error', 'خطأ', 'Something went wrong', 4000);
                }
            });
        },
        error: function(xhr, status, error) {
            console.error('Error fetching CSRF token:', error);
        }
    });
})

$(document).on("click", ".link-google", function(e) {
    window.location.href = '/api/google_oauth_link'; // Redirect to the OAuth route
})

$(document).on("click", ".remover-link-google", function(e) {
    $.ajax({
        url: '/get-csrf-token',
        type: 'GET',
        success: function(response) {
            const csrfToken = response.csrfToken; // Correctly initialize csrfToken

            // Prepare login data, including recaptchaToken
            const formData = {};

            // Perform login AJAX request
            $.ajax({
                url: '/api/unlink_google',
                type: 'POST',
                headers: {
                    'X-CSRF-Token': csrfToken // Add CSRF token in headers
                },
                data: formData, // Send the formData object (contains username, password, and recaptchaToken)
                success: function(response) {
                    if (response.success) {
                        Web.Notify('success', 'نجاح', response.message, 4000);
                        setTimeout(() => {
                            location.reload(); // Reload after success
                        }, 2000);
                    } else {
                        Web.Notify('error', 'خطأ', response.message, 4000);
                    }
                },
                error: function(xhr, status, error) {
                    Web.Notify('error', 'خطأ', 'Something went wrong', 4000);
                }
            });
        },
        error: function(xhr, status, error) {
            console.error('Error fetching CSRF token:', error);
        }
    });
})

document.addEventListener("DOMContentLoaded", function() {
    // Simulate content load after 2 seconds
    setTimeout(() => {
        document.querySelectorAll(".vps-card-skeleton").forEach(e => {
            e.style.display = "none";
        });
        document.querySelectorAll(".vps-card").forEach(e => {
            e.style.display = "block";
        });
        $('.hexagon').fadeOut()

    }, 1000);

});

$(document).on("click", ".login-btn", (data) => {
    const username = $('.login-username').val();
    const password = $('.login-password').val();

    if (username === "") {
        grecaptcha.reset();
        return Web.Notify('error', 'حقول فارغة', 'حقل اسم المستخدم فارغ', 4000);
    }

    if (password === "") {
        grecaptcha.reset();
        return Web.Notify('error', 'حقول فارغة', 'حقل كلمة المرور فارغ', 4000);
    }


    data.preventDefault(); // Prevent form submission
    $.ajax({
        url: '/get-csrf-token',
        type: 'GET',
        success: function(response) {
            const csrfToken = response.csrfToken; // Correctly initialize csrfToken
            const recaptchaResponse = grecaptcha.getResponse();

            // Prepare login data, including recaptchaToken
            const formData = {
                username: username,
                password: password,
                remember_me: $('.remember_me').prop('checked'),
                recaptchaToken: recaptchaResponse // Append the recaptcha token to the form data
            };

            // Perform login AJAX request
            $.ajax({
                url: '/api/login',
                type: 'POST',
                headers: {
                    'X-CSRF-Token': csrfToken // Add CSRF token in headers
                },
                data: formData, // Send the formData object (contains username, password, and recaptchaToken)
                success: function(response) {
                    if (response.success) {
                        if (response.message == "not_active") {
                            window.location.href = '/verification';
                        }
                    } else {
                        grecaptcha.reset();
                        Web.Notify('error', 'خطأ', response.message, 4000);
                    }
                },
                error: function(xhr, status, error) {
                    grecaptcha.reset();
                    Web.Notify('error', 'خطأ', 'Something went wrong', 4000);
                }
            });
        },
        error: function(xhr, status, error) {
            grecaptcha.reset();
            console.error('Error fetching CSRF token:', error);
        }
    });
    // Execute reCAPTCHA and get the token
    // grecaptcha.ready(async() => {
    //     const token = await grecaptcha.execute('6LcAxFEqAAAAAI3vfwfPFjiORWywhyMb4oP785W-', {
    //         action: 'LOGIN'
    //     }); // Replace with your site key

    //     // Fetch CSRF token first before making login request

    // });
});

$(document).on("click", ".login-discord", function(e) {
    window.location.href = '/api/oauth_loging'; // Redirect to the OAuth route
})
$(document).on("click", ".login-google", function(e) {
    window.location.href = '/api/google_oauth_loging'; // Redirect to the OAuth route
})

$(document).on("click", ".reg-button", (data) => {
    const email = $('.reg-email').val();
    const username = $('.reg-user').val();
    const password = $('.reg-pass').val();
    const password2 = $('.reg-pass2').val();

    if (email === "") {
        return Web.Notify('error', 'حقول فارغة', 'حقل الاميل فارغ', 4000);
    }

    if (username === "") {
        return Web.Notify('error', 'حقول فارغة', 'حقل اسم المستخدم فارغ', 4000);
    }

    if (password === "") {
        return Web.Notify('error', 'حقول فارغة', 'حقل كلمة المرور فارغ', 4000);
    }

    if (password != password2) {
        return Web.Notify('error', 'خطأ', 'كلمة المرور غير متطابقة', 4000);
    }

    if (!$('.policecheck').prop('checked')) {
        return Web.Notify('error', 'خطأ', 'يجب عليك الموافقة على سياسات الموقع', 4000);
    }

    $.ajax({
        url: '/get-csrf-token',
        type: 'GET',
        success: function(response) {
            const csrfToken = response.csrfToken; // Now csrfToken is initialized
            $.ajax({
                url: '/api/register', // The API endpoint for registration
                type: 'POST', // Specifies this is a POST request
                headers: {
                    'X-CSRF-Token': csrfToken // Add the CSRF token to the headers (if required)
                },
                data: {
                    email: email, // Send the email as part of the data
                    username: username, // Send the username as part of the data
                    password: password, // Send the password as part of the data
                },
                success: function(response) {
                    // If registration was successful
                    if (response.success) {
                        Web.Notify('success', 'نجاح', response.message, 4000);
                        setTimeout(() => {
                            window.location.href = '/verification'; // Reload after success
                        }, 2000);
                    } else {
                        // If there was an issue, show an error notification
                        Web.Notify('error', 'خطأ', response.message, 4000);
                    }
                },
                error: function(xhr, status, error) {
                    // Handle any error that might occur during the request
                    Web.Notify('error', 'خطأ', 'Something went wrong', 4000);
                }
            });

        },
        error: function(xhr, status, error) {
            console.error('Error fetching CSRF token:', error);
        }
    });


})

$(window).on('scroll', function() {
    // Get the current scroll position and the window height
    let scrollTop = $(window).scrollTop();
    let windowHeight = $(window).height();

    // Get the position of the .feature-section
    let sectionTop = $('.feature-section').offset().top;
    let sectionHeight = $('.feature-section').outerHeight();

    // Check if the section is in the viewport
    if (scrollTop + windowHeight >= sectionTop && scrollTop <= sectionTop + sectionHeight) {
        // The section is visible in the viewport
        $('.feature-section-container').removeClass('hidden').addClass('visible');
    } else {
        // The section is not visible in the viewport
        $('.feature-section-container').removeClass('visible').addClass('hidden');
    }
});

GetPlan = (plan, cb) => {
    $.ajax({
        url: '/get-csrf-token',
        type: 'GET',
        success: function(response) {
            const csrfToken = response.csrfToken; // Now csrfToken is initialized
            $.ajax({
                url: '/api/servers',
                type: 'GET',
                headers: {
                    'X-CSRF-Token': csrfToken // Add the CSRF token to the headers
                },
                data: {
                    plan: plan, // This will be added as a query string (e.g., ?userid=1)
                },
                success: function(response) {
                    if (response.success) {
                        cb(response)
                    } else {
                        $('.basic-servers-section').append('<p>Error loading products.</p>');
                    }
                },
                error: function(xhr, status, error) {
                    $('.basic-servers-section').append('<p>Error fetching data.</p>');
                }
            });
        },
        error: function(xhr, status, error) {
            console.error('Error fetching CSRF token:', error);
        }
    });
}