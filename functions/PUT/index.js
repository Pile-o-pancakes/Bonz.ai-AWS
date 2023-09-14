const { sendResponse, sendError } = require("../../responses/index");
const { db } = require("../../services/db");

module.exports = async (event, context) => {

    try {

        const {
            guestName,
            numberOfGuests,
            bookedRoomsId,
            checkInDate,
            checkOutDate,
          } = JSON.parse(event.body);

        if (!guestName &&
            !numberOfGuests &&
            !bookedRoomsId &&
            !(checkInDate &&
              checkOutDate)
        ) {
            return sendResponse(400, {
                success: false,
                message: "At least one field to change must be provided",
                });
        }

        let bookingExists = false;

        if((checkInDate &&
            checkOutDate)) {

                bookingExists = await checkIfRoomTypeIsBooked(
                    checkInDate,
                    checkOutDate,
                    bookedRoomsId
                );
            }
        if (bookingExists) {
            return sendResponse(400, {
              success: false,
              message: 'Room type is already booked for provided dates',
            });
        }

        
    }

    catch (error) {

        return sendResponse(500, {
            success: false,
            message: error.message || "Could not process booking",
          });
    }
}