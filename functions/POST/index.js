const { sendResponse, sendError } = require('../../responses/index');
const { db } = require('../../services/db');
const { nanoid } = require('nanoid');

const roomType = [
  {
    id: 1,
    name: 'Single',
    price: 500,
    booked: false,
    maxGuests: 1,
  },
  {
    id: 2,
    name: 'Double',
    price: 1000,
    booked: false,
    maxGuests: 2,
  },
  {
    id: 3,
    name: 'Suite',
    price: 1500,
    booked: false,
    maxGuests: 3,
  },
];

async function checkIfRoomTypeIsBooked(checkInDate, checkOutDate, roomTypeId) {
  for (let i = 0; i < roomTypeId.length; i++) {
    const params = {
      TableName: 'Booking',
      FilterExpression:
        'contains(bookedRoomsId, :roomTypeId) AND ((checkInDate BETWEEN :checkInDate AND :checkOutDate) OR (checkOutDate BETWEEN :checkInDate AND :checkOutDate))',
      ExpressionAttributeValues: {
        ':checkInDate': checkInDate,
        ':checkOutDate': checkOutDate,
        ':roomTypeId': roomTypeId[i],
      },
    };

    const result = await db.scan(params).promise();
    if (result.Items.length > 0) return true;
  }
  return false;
}

function calculateNumberOfNights(checkInDate, checkOutDate) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const timeDifference = Math.abs(checkOut - checkIn);
  return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
}

async function bookRoom(
  guestName,
  numberOfGuests,
  bookedRoomsId,
  checkInDate,
  checkOutDate
) {
  let totalRooms = bookedRoomsId.length;
  let bookedRoomsTotalPrice = 0;

  for (let i = 0; i < totalRooms; i++) {
    if (bookedRoomsId[i] === 1) {
      bookedRoomsTotalPrice += 500;
    } else if (bookedRoomsId[i] === 2) {
      bookedRoomsTotalPrice += 1000;
    } else if (bookedRoomsId[i] === 3) {
      bookedRoomsTotalPrice += 1500;
    } else {
      throw new Error('Invalid room type');
    }
  }

  const numberOfNights = calculateNumberOfNights(checkInDate, checkOutDate);
  const totalAmount = bookedRoomsTotalPrice * numberOfNights;

  const newBooking = {
    id: nanoid(),
    guestName,
    numberOfGuests,
    bookedRoomsId,
    totalAmount,
    checkInDate,
    checkOutDate,
  };

  const orderToSend = {
    TableName: 'Booking',
    Item: newBooking,
  };

  await db.put(orderToSend).promise();

  return newBooking;
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
      !guestName ||
      !numberOfGuests ||
      !bookedRoomsId ||
      !checkInDate ||
      !checkOutDate
    ) {
      return sendResponse(400, {
        success: false,
        message: 'All required fields must be provided',
      });
    }

    const bookingExists = await checkIfRoomTypeIsBooked(
      checkInDate,
      checkOutDate,
      bookedRoomsId
    );
    if (bookingExists) {
      return sendResponse(400, {
        success: false,
        message: 'Room type is already booked for provided dates',
      });
    }

    const savedBooking = await bookRoom(
      guestName,
      numberOfGuests,
      bookedRoomsId,
      checkInDate,
      checkOutDate
    );

    return sendResponse(200, {
      success: true,
      booking: savedBooking,
    });
  } catch (error) {
    console.log(error);
    return sendResponse(500, {
      success: false,
      message: error.message || 'Could not process booking',
    });
  }
};
