const { sendResponse, sendError } = require('../../responses/index');
const { db } = require('../../services/db');
const { nanoid } = require('nanoid');

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

async function checkAvailableRooms(numberOfRooms, checkInDate, checkOutDate) {
  const bookedRoomsOnDates = await db
    .scan({
      TableName: 'Booking',
      FilterExpression:
        '((checkInDate BETWEEN :checkInDate AND :checkOutDate) OR (checkOutDate BETWEEN :checkInDate AND :checkOutDate))',
      ExpressionAttributeValues: {
        ':checkInDate': checkInDate,
        ':checkOutDate': checkOutDate,
      },
    })
    .promise();

  let bookedRooms = [];
  for (let i = 0; i < bookedRoomsOnDates.Items.length; i++) {
    const bookedRoomsId = bookedRoomsOnDates.Items[i].bookedRoomsId;
    for (let j = 0; j < bookedRoomsId.length; j++) {
      bookedRooms.push(bookedRoomsId[j]);
    }
  }

  if (bookedRooms.length + numberOfRooms > 20) {
    return false;
  } else {
    return true;
  }
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
  checkOutDate,
  email
) {
  const totalRooms = bookedRoomsId.length;
  let singleRoomCount = 0;
  let doubleRoomCount = 0;
  let suiteCount = 0;
  let bookedRoomsTotalPrice = 0;

  if (totalRooms > 20) {
    throw new Error('Exceeded the total number of rooms available.');
  }

  for (let i = 0; i < totalRooms; i++) {
    const roomTypeId = bookedRoomsId[i];
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

  const wantedRoomsToBook = bookedRoomsId;
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

  if (roomsToBook < numberOfGuests) {
    throw new Error('Invalid room selection for number of guests.');
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
    email,
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
      email,
    } = JSON.parse(event.body);

    if (
      !guestName ||
      !numberOfGuests ||
      !bookedRoomsId ||
      !checkInDate ||
      !checkOutDate ||
      !email
    ) {
      return sendResponse(400, {
        success: false,
        message: 'All required fields must be provided',
      });
    }

    const availableRooms = await checkAvailableRooms(
      bookedRoomsId.length,
      checkInDate,
      checkOutDate
    );

    if (!availableRooms) {
      return sendResponse(400, {
        success: false,
        message: 'Room type(s) is already booked for provided dates',
      });
    } else {
      const savedBooking = await bookRoom(
        guestName,
        numberOfGuests,
        bookedRoomsId,
        checkInDate,
        checkOutDate,
        email
      );

      return sendResponse(200, {
        success: true,
        booking: savedBooking,
      });
    }
  } catch (error) {
    console.log(error);
    return sendResponse(500, {
      success: false,
      message: error.message || 'Could not process booking',
    });
  }
};
