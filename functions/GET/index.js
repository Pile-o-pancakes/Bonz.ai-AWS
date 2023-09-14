const { sendResponse, sendError } = require('../../responses/index');
const { db } = require('../../services/db');

async function getAllBookings() {
  const bookings = await db.scan({ TableName: 'Booking' }).promise();

  return bookings.Items.map((booking) => ({
    bookingNumber: booking.id,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    numberOfGuests: booking.numberOfGuests,
    numberOfRooms: booking.bookedRoomsId.length,
    guestName: booking.guestName,
    email: booking.email,
  }));
}

exports.handler = async (event, context) => {
  try {
    const bookings = await getAllBookings();

    return sendResponse(200, {
      success: true,
      bookings: bookings,
    });
  } catch (error) {
    console.log(error);
    return sendResponse(500, {
      success: false,
      message: error.message || 'Could not fetch bookings',
    });
  }
};
