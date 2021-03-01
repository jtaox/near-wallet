import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { switchAccount, getAvailableAccountsBalance, getAccountBalance } from '../../actions/account';
import { connect } from 'react-redux';
import DesktopContainer from './DesktopContainer';
import MobileContainer from './MobileContainer';
import styled from 'styled-components';

const Container = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    @media (max-width: 991px) {
        bottom: ${props => props.open ? '0' : 'unset'};
    }

    h6 {
        font-size: 13px !important;
        margin-bottom: 10px !important;
        color: #72727A;
        font-weight: normal !important;
    }
`
class Navigation extends Component {

    state = {
        menuOpen: false
    }

    componentDidUpdate(prevState) {

        const { menuOpen } = this.state;

        if (menuOpen !== prevState.menuOpen) {
            if (menuOpen) {
                document.addEventListener('keydown', this.handleKeyDown);
                document.addEventListener('click', this.handleClick);
            } else {
                document.removeEventListener('keydown', this.handleKeyDown);
                document.removeEventListener('click', this.handleClick);
            }
        }
    }

    handleKeyDown = (e) => {
        if (e.keyCode === 27) {
            this.setState({ menuOpen: false });
        }
    }

    handleClick = (e) => {
        const desktopMenu = document.getElementById('desktop-menu');
        const mobileMenu = document.getElementById('mobile-menu');

        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || (!desktopMenu.contains(e.target) && !mobileMenu.contains(e.target))) {
            this.setState({ menuOpen: false });
        }

    }

    get showNavLinks() {
        return this.props.account.accountId;
    }

    get showLimitedNav() {   
        return window.location.pathname === '/sign'
    }

    toggleMenu = () => {
        if (!this.state.menuOpen) {
            this.props.getAvailableAccountsBalance()
        }

        this.setState(prevState => ({
            menuOpen: !prevState.menuOpen
        }));
    }

    handleSelectAccount = accountId => {
        this.props.switchAccount(accountId)
        this.setState({ menuOpen: false });
    }

    render() {
        const { menuOpen } = this.state;

        return (
            <Container id='nav-container' open={menuOpen}>
                <DesktopContainer
                    menuOpen={menuOpen}
                    toggleMenu={this.toggleMenu}
                    selectAccount={this.handleSelectAccount}
                    showNavLinks={this.showNavLinks}
                    showLimitedNav={this.showLimitedNav}
                    {...this.props}
                />
                <MobileContainer
                    menuOpen={menuOpen}
                    toggleMenu={this.toggleMenu}
                    selectAccount={this.handleSelectAccount}
                    showNavLinks={this.showNavLinks}
                    showLimitedNav={this.showLimitedNav}
                    {...this.props}
                />
            </Container>
        )
    }
}

const mapStateToProps = ({ account, availableAccounts }) => ({
    account,
    availableAccounts
})

const mapDispatchToProps = {
    switchAccount,
    getAvailableAccountsBalance,
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withRouter(Navigation))
