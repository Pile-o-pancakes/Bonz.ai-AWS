const { sendResponse, sendError } = require('../../responses/index');
const { db } = require('../../services/db');

const roomTypes = {
  1: {
    name: 'Single',
    price: 500,
    maxGuests: 1,
  },
  2: {
    name: 'Double',
    price: 1000,
    maxGuests: 2,
  },
  3: {
    name: 'Suite',
    price: 1500,
    maxGuests: 3,
  },
};

function calculateNumberOfNights(checkInDate, checkOutDate) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const timeDifference = Math.abs(checkOut - checkIn);
  return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
}

async function getBookingById(id) {
  const booking = await db
    .get({
      TableName: 'Booking',
      Key: {
        id,
      },
    })
    .promise();

  return booking.Item;
}

async function updateBookedRoom(booking) {
  const totalRooms = booking.bookedRoomsId.length;
  let singleRoomCount = 0;
  let doubleRoomCount = 0;
  let suiteCount = 0;
  let bookedRoomsTotalPrice = 0;

  if (totalRooms > 20) {
    throw new Error('Exceeded the total number of rooms available.');
  }

  for (let i = 0; i < totalRooms; i++) {
    const roomTypeId = booking.bookedRoomsId[i];
    const roomType = roomTypes[roomTypeId];

    if (!roomType) {
      throw new Error('Invalid room type');
    }

    if (roomType.name === 'Single') {
      singleRoomCount++;
      bookedRoomsTotalPrice += roomType.price;
    } else if (roomType.name === 'Double') {
      doubleRoomCount++;
      bookedRoomsTotalPrice += roomType.price;
    } else if (roomType.name === 'Suite') {
      suiteCount++;
      bookedRoomsTotalPrice += roomType.price;
    }
  }

  const wantedRoomsToBook = booking.bookedRoomsId;
  let roomsToBook = 0;
  for (let i = 0; i < wantedRoomsToBook.length; i++) {
    const roomTypeId = wantedRoomsToBook[i];
    const roomType = roomTypes[roomTypeId];

    if (!roomType) {
      throw new Error('Invalid room type');
    }

    if (roomType.name === 'Single') {
      roomsToBook += 1;
    } else if (roomType.name === 'Double') {
      roomsToBook += 2;
    } else if (roomType.name === 'Suite') {
      roomsToBook += 3;
    }
  }

  if (roomsToBook < booking.numberOfGuests) {
    throw new Error('Invalid room selection for number of guests.');
  }

  const numberOfNights = calculateNumberOfNights(
    booking.checkInDate,
    booking.checkOutDate
  );
  const totalAmount = bookedRoomsTotalPrice * numberOfNights;

  const updatedBooking = {
    guestName: booking.guestName,
    numberOfGuests: booking.numberOfGuests,
    bookedRoomsId: booking.bookedRoomsId,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    totalAmount: totalAmount,
  };

  await db
    .update({
      TableName: 'Booking',
      Key: {
        id: booking.id,
      },
      UpdateExpression:
        'set guestName = :guestName, numberOfGuests = :numberOfGuests, bookedRoomsId = :bookedRoomsId, checkInDate = :checkInDate, checkOutDate = :checkOutDate, totalAmount = :totalAmount',
      ExpressionAttributeValues: {
        ':guestName': updatedBooking.guestName,
        ':numberOfGuests': updatedBooking.numberOfGuests,
        ':bookedRoomsId': updatedBooking.bookedRoomsId,
        ':checkInDate': updatedBooking.checkInDate,
        ':checkOutDate': updatedBooking.checkOutDate,
        ':totalAmount': updatedBooking.totalAmount,
      },
      ReturnValues: 'ALL_NEW',
    })
    .promise();

  return updatedBooking;
}

exports.handler = async (event, context) => {
  try {
    const {
      guestName,
      numberOfGuests,
      bookedRoomsId,
      checkInDate,
      checkOutDate,
    } = JSON.parse(event.body);

    if (
      !guestName &&
      !numberOfGuests &&
      !bookedRoomsId &&
      !(checkInDate && checkOutDate)
    ) {
      return sendResponse(400, {
        success: false,
        message: 'At least one field to change must be provided',
      });
    }

    const booking = await getBookingById(event.pathParameters.id);

    if (!booking) {
      return sendResponse(404, {
        success: false,
        message: 'Booking not found',
      });
    }

    const updatedBooking = {
      ...booking,
      guestName: guestName || booking.guestName,
      numberOfGuests: numberOfGuests || booking.numberOfGuests,
      bookedRoomsId: bookedRoomsId || booking.bookedRoomsId,
      checkInDate: checkInDate || booking.checkInDate,
      checkOutDate: checkOutDate || booking.checkOutDate,
    };

    const orderToSend = await updateBookedRoom(updatedBooking);

    if (orderToSend) {
      return sendResponse(200, {
        success: true,
        message: 'Booking updated successfully',
        booking: orderToSend,
      });
    } else {
      return sendResponse(400, {
        success: false,
        message: 'Could not update booking',
      });
    }
  } catch (error) {
    return sendResponse(500, {
      success: false,
      message: error.message || 'Could not process booking',
    });
  }
};
