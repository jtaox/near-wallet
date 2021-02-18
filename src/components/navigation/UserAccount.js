import React from 'react';
import styled from 'styled-components';
import UserIcon from '../svg/UserIcon'
import ChevronIcon from '../svg/ChevronIcon'

const Container = styled.div`
    background-color: black;
    display: flex;
    align-items: center;
    border-radius: 40px;
    padding: 2px 5px 2px 2px;
    cursor: pointer;
    user-select: none;

    .user-icon {
        min-width: 36px;
        min-height: 36px;
        .background {
            fill: transparent;
        }
    }

    > div {
        :first-of-type {
            font-weight: 600;
            margin: 0 15px 0 9px;
            white-space: nowrap;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        :last-of-type {
            background-color: #3F4045;
            min-width: 28px;
            min-height: 28px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transform: rotate(90deg);

            svg {
                width: 7px;
            }
        }
    }
`

const UserAccount = ({ accountId = '', onClick }) => (
    <Container onClick={onClick}>
        <UserIcon/>
        <div>{accountId}</div>
        <div>
            <ChevronIcon/>
        </div>
    </Container>
)

export default UserAccount;